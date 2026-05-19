"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { HANDOFF_SHIFTS, SHIFTS } from "@/lib/constants/daily-ops";

const createLogSchema = z.object({
  locationId: z.string().uuid(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum(SHIFTS as [string, ...string[]]),
  body: z.string().min(1, "Body is required").max(10000),
});

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

  const { data: log, error } = await supabase
    .from("manager_logs")
    .insert({
      created_by: user.id,
      author_id: user.id,
      location_id: v.locationId,
      log_date: v.logDate,
      shift: v.shift,
      body: v.body.trim(),
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
    summary: log.body.slice(0, 140),
    locationId: log.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { log };
}

const updateLogSchema = z.object({
  logId: z.string().uuid(),
  body: z.string().min(1).max(10000),
});

export async function updateManagerLog(raw: z.input<typeof updateLogSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateLogSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: log, error } = await supabase
    .from("manager_logs")
    .update({ body: v.body.trim() })
    .eq("id", v.logId)
    .select("*")
    .single();
  if (error || !log) return { error: error?.message ?? "Could not update" };

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
