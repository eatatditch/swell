"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";

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
  decision: z.string().min(1, "Decision is required").max(10000),
  context: z.string().max(10000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  decidedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  followUp: z.string().max(2000).optional().nullable(),
  followUpDue: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export type CreateDecisionInput = z.input<typeof createSchema>;

export async function createDecision(raw: CreateDecisionInput) {
  const { supabase, userId, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: decision, error } = await supabase
    .from("decision_logs")
    .insert({
      created_by: userId,
      title: v.title.trim(),
      decision: v.decision.trim(),
      context: v.context?.trim() || null,
      owner_id: v.ownerId ?? null,
      decided_on: v.decidedOn,
      follow_up: v.followUp?.trim() || null,
      follow_up_due: v.followUpDue ?? null,
    })
    .select("*")
    .single();

  if (error || !decision) {
    return { error: error?.message ?? "Could not log decision" };
  }

  await logActivity({
    verb: "created",
    objectType: "decision_log",
    objectId: decision.id,
    summary: decision.title,
  });

  revalidatePath("/founder");
  return { decision };
}

export async function markFollowUpDone(id: string, done: boolean) {
  const { supabase, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const { data, error } = await supabase
    .from("decision_logs")
    .update({ follow_up_done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, title")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  await logActivity({
    verb: done ? "completed" : "updated",
    objectType: "decision_log",
    objectId: id,
    summary: data.title,
    metadata: { follow_up: done ? "done" : "reopened" },
  });

  revalidatePath("/founder");
  return { ok: true };
}

export async function deleteDecision(id: string) {
  const { supabase, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const { error } = await supabase.from("decision_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/founder");
  return { ok: true };
}
