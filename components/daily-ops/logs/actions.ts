"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { HANDOFF_SHIFTS, SHIFTS } from "@/lib/constants/daily-ops";

const moneyCents = z
  .number()
  .int()
  .min(0)
  .max(1_000_000_000)
  .optional()
  .nullable();
const guestCount = z
  .number()
  .int()
  .min(0)
  .max(100_000)
  .optional()
  .nullable();

const createLogSchema = z
  .object({
    locationId: z.string().uuid(),
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    shift: z.enum(SHIFTS as [string, ...string[]]),
    notes: z.string().max(10000).optional().nullable(),
    salesCents: moneyCents,
    guestCount,
    compsCents: moneyCents,
    voidsCents: moneyCents,
    checklistCompletionId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (v) =>
      (v.notes ?? "").trim().length > 0 ||
      v.salesCents != null ||
      v.guestCount != null ||
      v.compsCents != null ||
      v.voidsCents != null,
    { message: "Add notes or at least one number" },
  );

export type CreateManagerLogInput = z.input<typeof createLogSchema>;

export async function createManagerLog(raw: CreateManagerLogInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const trimmedNotes = v.notes?.trim() || null;

  const { data: log, error } = await supabase
    .from("manager_logs")
    .insert({
      created_by: user.id,
      author_id: user.id,
      location_id: v.locationId,
      log_date: v.logDate,
      shift: v.shift,
      body: null,
      notes: trimmedNotes,
      sales_cents: v.salesCents ?? null,
      guest_count: v.guestCount ?? null,
      comps_cents: v.compsCents ?? null,
      voids_cents: v.voidsCents ?? null,
      checklist_completion_id: v.checklistCompletionId ?? null,
    })
    .select("*")
    .single();

  if (error || !log) {
    return { error: error?.message ?? "Could not create log" };
  }

  await logActivity({
    verb: "created",
    objectType: "manager_log",
    objectId: log.id,
    summary: summarizeLog(log),
    locationId: log.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { log };
}

const updateLogSchema = z
  .object({
    logId: z.string().uuid(),
    notes: z.string().max(10000).optional().nullable(),
    salesCents: moneyCents,
    guestCount,
    compsCents: moneyCents,
    voidsCents: moneyCents,
  })
  .refine(
    (v) =>
      (v.notes ?? "").trim().length > 0 ||
      v.salesCents != null ||
      v.guestCount != null ||
      v.compsCents != null ||
      v.voidsCents != null,
    { message: "Add notes or at least one number" },
  );

export type UpdateManagerLogInput = z.input<typeof updateLogSchema>;

export async function updateManagerLog(raw: UpdateManagerLogInput) {
  const supabase = createSupabaseServerClient();
  const parsed = updateLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const trimmedNotes = v.notes?.trim() || null;

  const { data: log, error } = await supabase
    .from("manager_logs")
    .update({
      notes: trimmedNotes,
      body: null,
      sales_cents: v.salesCents ?? null,
      guest_count: v.guestCount ?? null,
      comps_cents: v.compsCents ?? null,
      voids_cents: v.voidsCents ?? null,
    })
    .eq("id", v.logId)
    .select("*")
    .single();
  if (error || !log) return { error: error?.message ?? "Could not update" };

  await logActivity({
    verb: "updated",
    objectType: "manager_log",
    objectId: log.id,
    summary: summarizeLog(log),
    locationId: log.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { log };
}

export async function deleteManagerLog(logId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("manager_logs").delete().eq("id", logId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

const createNoteSchema = z.object({
  locationId: z.string().uuid(),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromShift: z.enum(HANDOFF_SHIFTS as [string, ...string[]]),
  toShift: z.enum(HANDOFF_SHIFTS as [string, ...string[]]),
  body: z.string().min(1, "Body is required").max(10000),
});

export type CreateShiftNoteInput = z.input<typeof createNoteSchema>;

export async function createShiftNote(raw: CreateShiftNoteInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: note, error } = await supabase
    .from("shift_notes")
    .insert({
      created_by: user.id,
      author_id: user.id,
      location_id: v.locationId,
      note_date: v.noteDate,
      from_shift: v.fromShift,
      to_shift: v.toShift,
      body: v.body.trim(),
    })
    .select("*")
    .single();

  if (error || !note) {
    return { error: error?.message ?? "Could not create handoff note" };
  }

  await logActivity({
    verb: "created",
    objectType: "shift_note",
    objectId: note.id,
    summary: note.body.slice(0, 140),
    locationId: note.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { note };
}

export async function deleteShiftNote(noteId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("shift_notes").delete().eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

function summarizeLog(log: {
  notes: string | null;
  sales_cents: number | null;
  guest_count: number | null;
}): string {
  if (log.notes) return log.notes.slice(0, 140);
  const bits: string[] = [];
  if (log.sales_cents != null) {
    bits.push(`sales $${(log.sales_cents / 100).toFixed(2)}`);
  }
  if (log.guest_count != null) bits.push(`${log.guest_count} guests`);
  return bits.join(" · ") || "Manager log";
}
