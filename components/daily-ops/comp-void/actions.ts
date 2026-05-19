"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { COMP_VOID_KINDS } from "@/lib/constants/daily-ops";

const createSchema = z.object({
  locationId: z.string().uuid(),
  kind: z.enum(COMP_VOID_KINDS as [string, ...string[]]),
  amount: z.number().min(0).max(1_000_000),
  reason: z.string().min(1, "Reason is required").max(2000),
  ticketRef: z.string().max(64).optional().nullable(),
  occurredAt: z.string().optional().nullable(),
});

export type CreateCompVoidInput = z.input<typeof createSchema>;

export async function createCompVoidNote(raw: CreateCompVoidInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const amountCents = Math.round(v.amount * 100);

  const { data: row, error } = await supabase
    .from("comp_void_notes")
    .insert({
      created_by: user.id,
      location_id: v.locationId,
      kind: v.kind,
      amount_cents: amountCents,
      reason: v.reason.trim(),
      manager_id: user.id,
      ticket_ref: v.ticketRef ?? null,
      occurred_at: v.occurredAt
        ? new Date(v.occurredAt).toISOString()
        : new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !row) {
    return {
      error:
        error?.message ??
        "Could not record. Managers only — confirm your role and location access.",
    };
  }

  await logActivity({
    verb: "created",
    objectType: "comp_void",
    objectId: row.id,
    summary: `${v.kind.toUpperCase()} $${v.amount.toFixed(2)}: ${v.reason.slice(0, 80)}`,
    locationId: row.location_id,
    metadata: { kind: v.kind, amount_cents: amountCents },
  });

  revalidatePath("/daily-ops", "layout");
  return { row };
}

export async function deleteCompVoidNote(noteId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("comp_void_notes")
    .delete()
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}
