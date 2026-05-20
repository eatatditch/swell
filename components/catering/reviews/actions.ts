"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { REVIEW_PLATFORMS } from "@/lib/constants/catering";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  platform: z.enum(REVIEW_PLATFORMS as [string, ...string[]]),
  requestSentAt: z.string().optional().nullable(),
  responseReceivedAt: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpsertReviewInput = z.input<typeof upsertSchema>;

export async function upsertReviewRequest(raw: UpsertReviewInput) {
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
    platform: v.platform,
    request_sent_at: v.requestSentAt
      ? new Date(v.requestSentAt).toISOString()
      : null,
    response_received_at: v.responseReceivedAt
      ? new Date(v.responseReceivedAt).toISOString()
      : null,
    rating: v.rating ?? null,
    link: v.link || null,
    notes: v.notes || null,
  };

  if (v.id) {
    const { data: row, error } = await supabase
      .from("event_review_requests")
      .update(payload)
      .eq("id", v.id)
      .select("*, event:catering_events(location_id)")
      .single();
    if (error || !row) return { error: error?.message ?? "Could not update" };

    await logActivity({
      verb: row.response_received_at ? "received" : "updated",
      objectType: "event_review",
      objectId: row.id,
      summary: `${row.platform} review${row.rating ? ` · ${row.rating}/5` : ""}`,
      locationId:
        (row.event as { location_id: string | null } | null)?.location_id ?? null,
    });
    revalidatePath("/catering", "layout");
    return { row };
  }

  const { data: row, error } = await supabase
    .from("event_review_requests")
    .insert({ created_by: user.id, ...payload })
    .select("*, event:catering_events(location_id)")
    .single();
  if (error || !row) return { error: error?.message ?? "Could not create" };

  await logActivity({
    verb: "created",
    objectType: "event_review",
    objectId: row.id,
    summary: `${row.platform} review request`,
    locationId:
      (row.event as { location_id: string | null } | null)?.location_id ?? null,
  });

  revalidatePath("/catering", "layout");
  return { row };
}

export async function deleteReviewRequest(reviewId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("event_review_requests")
    .delete()
    .eq("id", reviewId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}
