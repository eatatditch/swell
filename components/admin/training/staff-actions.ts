"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { logActivity } from "@/lib/server/activity";
import { canWriteContent } from "@/lib/server/training";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  TRAINING_STAFF_TYPES,
  generateKioskPin,
} from "@/lib/constants/training";
import type { Role } from "@/lib/types/database";

interface ManagerContext {
  userId: string | null;
  role: Role | null;
  error: string | null;
}

async function requireManager(): Promise<ManagerContext> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, role: null, error: "Not signed in" };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role: Role } | null)?.role ?? null;
  if (!role || !canWriteContent(role)) {
    return { userId: user.id, role, error: "Managers only" };
  }
  return { userId: user.id, role, error: null };
}

const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "PIN must be 4–6 digits");

const createStaffSchema = z.object({
  fullName: z.string().min(1, "Name required").max(120),
  staffType: z.enum(TRAINING_STAFF_TYPES as [string, ...string[]]),
  locationId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  pin: pinSchema.optional(),
  linkedProfileId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  autoAssignPaths: z.boolean().optional().default(true),
});

export interface CreateStaffResult {
  ok: true;
  staffId: string;
  pin: string;
  pathsAssigned: number;
}

export async function createTrainingStaff(
  raw: z.input<typeof createStaffSchema>,
): Promise<CreateStaffResult | { error: string }> {
  const ctx = await requireManager();
  if (ctx.error) return { error: ctx.error };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const pin = v.pin ?? generateKioskPin();

  const admin = createSupabaseAdminClient();

  const { data: hashRow, error: hashErr } = await admin.rpc(
    "kiosk_hash_pin",
    { p_pin: pin },
  );
  if (hashErr || typeof hashRow !== "string") {
    return { error: hashErr?.message ?? "Could not hash PIN" };
  }

  const { data: row, error } = await admin
    .from("training_staff")
    .insert({
      created_by: ctx.userId,
      full_name: v.fullName.trim(),
      staff_type: v.staffType,
      email: v.email?.trim() || null,
      phone: v.phone?.trim() || null,
      location_id: v.locationId ?? null,
      pin_hash: hashRow,
      start_date: v.startDate ?? null,
      notes: v.notes?.trim() || null,
      linked_profile_id: v.linkedProfileId ?? null,
    })
    .select("id")
    .single();
  if (error || !row) {
    return { error: error?.message ?? "Could not create staff" };
  }

  await logActivity({
    verb: "created",
    objectType: "training_staff",
    objectId: row.id as string,
    summary: `${v.fullName} (${v.staffType.toUpperCase()})`,
  });

  let pathsAssigned = 0;
  if (v.autoAssignPaths) {
    const { data: paths } = await admin
      .from("training_paths")
      .select(
        "id, course_interval_days, path_courses:training_path_courses(id)",
      )
      .eq("is_active", true)
      .contains("target_staff_types", [v.staffType]);
    if (paths && paths.length > 0) {
      const toInsert = paths.map((p) => {
        const courseCount =
          (p.path_courses as { id: string }[] | null)?.length ?? 0;
        const intervalDays =
          (p.course_interval_days as number | null) ?? 7;
        const dueAt =
          courseCount > 0
            ? new Date(Date.now() + courseCount * intervalDays * 86_400_000)
            : null;
        return {
          staff_id: row.id as string,
          path_id: p.id as string,
          assigned_by: ctx.userId,
          assigned_reason: "role" as const,
          due_date: dueAt ? dueAt.toISOString().slice(0, 10) : null,
        };
      });
      const { error: pathErr } = await admin
        .from("staff_training_paths")
        .insert(toInsert);
      if (!pathErr) pathsAssigned = toInsert.length;
    }
  }

  revalidatePath("/training/staff", "layout");
  return { ok: true, staffId: row.id as string, pin, pathsAssigned };
}

const updateStaffSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  staffType: z.enum(TRAINING_STAFF_TYPES as [string, ...string[]]),
  locationId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  linkedProfileId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean(),
});

export async function updateTrainingStaff(
  raw: z.input<typeof updateStaffSchema>,
) {
  const ctx = await requireManager();
  if (ctx.error) return { error: ctx.error };

  const parsed = updateStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("training_staff")
    .update({
      full_name: v.fullName.trim(),
      staff_type: v.staffType,
      email: v.email?.trim() || null,
      phone: v.phone?.trim() || null,
      location_id: v.locationId ?? null,
      start_date: v.startDate ?? null,
      linked_profile_id: v.linkedProfileId ?? null,
      notes: v.notes?.trim() || null,
      is_active: v.isActive,
    })
    .eq("id", v.id);
  if (error) return { error: error.message };

  revalidatePath("/training/staff", "layout");
  return { ok: true };
}

const resetPinSchema = z.object({
  id: z.string().uuid(),
  pin: pinSchema.optional(),
});

export async function resetStaffPin(raw: z.input<typeof resetPinSchema>) {
  const ctx = await requireManager();
  if (ctx.error) return { error: ctx.error };

  const parsed = resetPinSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const pin = v.pin ?? generateKioskPin();

  const admin = createSupabaseAdminClient();
  const { data: hash, error: hashErr } = await admin.rpc("kiosk_hash_pin", {
    p_pin: pin,
  });
  if (hashErr || typeof hash !== "string") {
    return { error: hashErr?.message ?? "Could not hash PIN" };
  }

  const { error } = await admin
    .from("training_staff")
    .update({ pin_hash: hash })
    .eq("id", v.id);
  if (error) return { error: error.message };

  await logActivity({
    verb: "updated",
    objectType: "training_staff",
    objectId: v.id,
    summary: "PIN reset",
  });

  revalidatePath("/training/staff", "layout");
  return { ok: true, pin };
}

export async function deleteTrainingStaff(id: string) {
  const ctx = await requireManager();
  if (ctx.error) return { error: ctx.error };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("training_staff").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    verb: "deleted",
    objectType: "training_staff",
    objectId: id,
    summary: "Staff removed",
  });

  revalidatePath("/training/staff", "layout");
  return { ok: true };
}
