"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { FOUNDER_PRIORITY_STATUSES } from "@/lib/constants/founder";
import { PRIORITIES } from "@/lib/constants/tasks";
import type { FounderPriorityStatus } from "@/lib/types/database";

async function requireAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "founder_admin") {
    return { supabase, error: "Admins only" as const };
  }
  return { supabase, userId: user.id };
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).default("normal"),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export type CreatePriorityInput = z.input<typeof createSchema>;

export async function createPriority(raw: CreatePriorityInput) {
  const { supabase, userId, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Default position = max+1 so new priorities stack at the bottom of "open".
  const { data: top } = await supabase
    .from("founder_priorities")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (top?.position ?? 0) + 1;

  const { data: priority, error } = await supabase
    .from("founder_priorities")
    .insert({
      created_by: userId,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      owner_id: v.ownerId ?? null,
      priority: v.priority,
      target_date: v.targetDate ?? null,
      position: nextPosition,
      status: "open",
    })
    .select("*")
    .single();

  if (error || !priority) {
    return { error: error?.message ?? "Could not create priority" };
  }

  await logActivity({
    verb: "created",
    objectType: "founder_priority",
    objectId: priority.id,
    summary: priority.title,
  });

  if (priority.owner_id && priority.owner_id !== userId) {
    await notify({
      recipientId: priority.owner_id,
      kind: "priority_assigned",
      title: "Strategic priority assigned",
      body: priority.title,
      link: "/founder",
      sourceType: "founder_priority",
      sourceId: priority.id,
    });
  }

  revalidatePath("/founder");
  return { priority };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  status: z
    .enum(FOUNDER_PRIORITY_STATUSES as [string, ...string[]])
    .optional(),
});

export type UpdatePriorityInput = z.input<typeof updateSchema>;

export async function updatePriority(raw: UpdatePriorityInput) {
  const { supabase, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const patch: Record<string, unknown> = {};
  if (v.title !== undefined) patch.title = v.title.trim();
  if (v.description !== undefined)
    patch.description = v.description?.trim() || null;
  if (v.ownerId !== undefined) patch.owner_id = v.ownerId ?? null;
  if (v.priority !== undefined) patch.priority = v.priority;
  if (v.targetDate !== undefined) patch.target_date = v.targetDate ?? null;
  if (v.status !== undefined) patch.status = v.status;

  const { data: priority, error } = await supabase
    .from("founder_priorities")
    .update(patch)
    .eq("id", v.id)
    .select("*")
    .single();

  if (error || !priority) {
    return { error: error?.message ?? "Could not update priority" };
  }

  await logActivity({
    verb: v.status === "done" ? "completed" : "updated",
    objectType: "founder_priority",
    objectId: priority.id,
    summary: priority.title,
    metadata: v.status ? { status: v.status } : undefined,
  });

  revalidatePath("/founder");
  return { priority };
}

export async function setPriorityStatus(
  id: string,
  status: FounderPriorityStatus,
) {
  return updatePriority({ id, status });
}

export async function deletePriority(id: string) {
  const { supabase, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("founder_priorities")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/founder");
  return { ok: true };
}
