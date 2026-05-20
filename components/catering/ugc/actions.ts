"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { UGC_CONTENT_TYPES, UGC_STATUSES } from "@/lib/constants/catering";
import type { EventUgcStatus } from "@/lib/types/database";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  contactName: z.string().trim().max(200).optional().nullable(),
  instagramHandle: z.string().trim().max(100).optional().nullable(),
  contentType: z
    .enum(UGC_CONTENT_TYPES as [string, ...string[]])
    .default("photos"),
  status: z.enum(UGC_STATUSES as [string, ...string[]]).default("planned"),
  plannedFor: z.string().optional().nullable(),
  postedLink: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
});

export type UpsertUgcInput = z.input<typeof upsertSchema>;

export async function upsertUgc(raw: UpsertUgcInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const payload = {
    event_id: v.eventId,
    owner_id: v.ownerId ?? user.id,
    contact_name: v.contactName || null,
    instagram_handle: v.instagramHandle || null,
    content_type: v.contentType,
    status: v.status,
    planned_for: v.plannedFor ? new Date(v.plannedFor).toISOString() : null,
    posted_link: v.postedLink || null,
    notes: v.notes || null,
  };

  if (v.id) {
    const { data: row, error } = await supabase
      .from("event_ugc_opportunities")
      .update(payload)
      .eq("id", v.id)
      .select("*, event:catering_events(location_id, title)")
      .single();
    if (error || !row) return { error: error?.message ?? "Could not update" };

    await logActivity({
      verb: "updated",
      objectType: "event_ugc",
      objectId: row.id,
      summary: `UGC ${row.content_type} → ${row.status}`,
      locationId:
        (row.event as { location_id: string | null } | null)?.location_id ?? null,
    });
    revalidatePath("/catering", "layout");
    return { row };
  }

  const { data: row, error } = await supabase
    .from("event_ugc_opportunities")
    .insert({ created_by: user.id, ...payload })
    .select("*, event:catering_events(location_id, title)")
    .single();
  if (error || !row) return { error: error?.message ?? "Could not create" };

  await logActivity({
    verb: "created",
    objectType: "event_ugc",
    objectId: row.id,
    summary: `UGC opportunity (${row.content_type})`,
    locationId:
      (row.event as { location_id: string | null } | null)?.location_id ?? null,
  });

  revalidatePath("/catering", "layout");
  return { row };
}

export async function setUgcStatus(ugcId: string, status: EventUgcStatus) {
  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = { status };
  const { data: row, error } = await supabase
    .from("event_ugc_opportunities")
    .update(update)
    .eq("id", ugcId)
    .select("*, event:catering_events(location_id, title)")
    .single();
  if (error || !row) return { error: error?.message ?? "Could not update" };

  await logActivity({
    verb:
      status === "captured" ? "captured" : status === "posted" ? "posted" : "updated",
    objectType: "event_ugc",
    objectId: row.id,
    summary: `UGC ${row.content_type} → ${status}`,
    locationId:
      (row.event as { location_id: string | null } | null)?.location_id ?? null,
  });

  revalidatePath("/catering", "layout");
  return { row };
}

export async function deleteUgc(ugcId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("event_ugc_opportunities")
    .delete()
    .eq("id", ugcId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}
