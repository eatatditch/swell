"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { FOLLOWUP_KINDS } from "@/lib/constants/catering";

const createSchema = z.object({
  leadId: z.string().uuid(),
  kind: z.enum(FOLLOWUP_KINDS as [string, ...string[]]).default("task"),
  body: z.string().trim().min(1, "Body required").max(2000),
  dueAt: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

export type CreateFollowupInput = z.input<typeof createSchema>;

export async function createFollowup(raw: CreateFollowupInput) {
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

  const { data: lead } = await supabase
    .from("catering_leads")
    .select("id, contact_name, location_id, owner_id")
    .eq("id", v.leadId)
    .maybeSingle();

  const { data: followup, error } = await supabase
    .from("catering_followups")
    .insert({
      created_by: user.id,
      lead_id: v.leadId,
      kind: v.kind,
      body: v.body,
      due_at: v.dueAt ? new Date(v.dueAt).toISOString() : null,
      assigned_to: v.assignedTo ?? lead?.owner_id ?? user.id,
    })
    .select("*")
    .single();

  if (error || !followup) {
    return { error: error?.message ?? "Could not create follow-up" };
  }

  await logActivity({
    verb: "created",
    objectType: "catering_followup",
    objectId: followup.id,
    summary: `Follow-up for ${lead?.contact_name ?? "lead"}: ${followup.body.slice(0, 80)}`,
    locationId: lead?.location_id ?? null,
  });

  if (followup.assigned_to && followup.assigned_to !== user.id) {
    await notify({
      recipientId: followup.assigned_to,
      kind: "followup_assigned",
      title: "Follow-up assigned",
      body: followup.body,
      link: `/catering/leads/${followup.lead_id}`,
      sourceType: "catering_followup",
      sourceId: followup.id,
    });
  }

  revalidatePath("/catering", "layout");
  return { followup };
}

export async function completeFollowup(followupId: string, done: boolean) {
  const supabase = createSupabaseServerClient();
  const { data: followup, error } = await supabase
    .from("catering_followups")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", followupId)
    .select("*, lead:catering_leads(id, location_id)")
    .single();
  if (error || !followup) return { error: error?.message ?? "Could not update" };

  await logActivity({
    verb: done ? "completed" : "updated",
    objectType: "catering_followup",
    objectId: followup.id,
    summary: followup.body.slice(0, 80),
    locationId:
      (followup.lead as { location_id: string | null } | null)?.location_id ?? null,
  });

  revalidatePath("/catering", "layout");
  return { followup };
}

export async function deleteFollowup(followupId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("catering_followups")
    .delete()
    .eq("id", followupId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}
