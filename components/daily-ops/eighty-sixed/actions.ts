"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";

const createSchema = z.object({
  locationId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  reason: z.string().max(2000).optional().nullable(),
  until: z.string().optional().nullable(),
});

export type CreateEightySixedInput = z.input<typeof createSchema>;

export async function createEightySixedItem(raw: CreateEightySixedInput) {
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

  const { data: row, error } = await supabase
    .from("eighty_sixed_items")
    .insert({
      created_by: user.id,
      location_id: v.locationId,
      name: v.name,
      reason: v.reason ?? null,
      until_at: v.until ? new Date(v.until).toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !row) {
    return { error: error?.message ?? "Could not 86 item" };
  }

  await logActivity({
    verb: "created",
    objectType: "eighty_sixed",
    objectId: row.id,
    summary: row.name,
    locationId: row.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { row };
}

export async function resolveEightySixedItem(itemId: string) {
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("eighty_sixed_items")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error || !row) return { error: error?.message ?? "Could not resolve" };

  await logActivity({
    verb: "completed",
    objectType: "eighty_sixed",
    objectId: row.id,
    summary: `Back on: ${row.name}`,
    locationId: row.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { row };
}

export async function deleteEightySixedItem(itemId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("eighty_sixed_items")
    .delete()
    .eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}
