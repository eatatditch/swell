"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { MENU_CATEGORIES } from "@/lib/constants/catering";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  position: z.number().int().min(0).max(10_000).default(0),
  category: z.enum(MENU_CATEGORIES as [string, ...string[]]).default("food"),
  name: z.string().trim().min(1, "Name required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  quantity: z.number().min(0).max(100_000).default(1),
  unitPrice: z.number().min(0).max(1_000_000).default(0),
});

export type UpsertMenuItemInput = z.input<typeof upsertSchema>;

export async function upsertMenuItem(raw: UpsertMenuItemInput) {
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
    position: v.position,
    category: v.category,
    name: v.name,
    description: v.description || null,
    quantity: v.quantity,
    unit_price_cents: Math.round(v.unitPrice * 100),
  };

  if (v.id) {
    const { data: item, error } = await supabase
      .from("event_menu_items")
      .update(payload)
      .eq("id", v.id)
      .select("*, event:catering_events(location_id)")
      .single();
    if (error || !item) return { error: error?.message ?? "Could not update" };

    await logActivity({
      verb: "updated",
      objectType: "event_menu_item",
      objectId: item.id,
      summary: item.name,
      locationId:
        (item.event as { location_id: string | null } | null)?.location_id ?? null,
    });
    revalidatePath("/catering", "layout");
    return { item };
  }

  const { data: item, error } = await supabase
    .from("event_menu_items")
    .insert({ created_by: user.id, ...payload })
    .select("*, event:catering_events(location_id)")
    .single();
  if (error || !item) return { error: error?.message ?? "Could not add" };

  await logActivity({
    verb: "created",
    objectType: "event_menu_item",
    objectId: item.id,
    summary: item.name,
    locationId:
      (item.event as { location_id: string | null } | null)?.location_id ?? null,
  });

  revalidatePath("/catering", "layout");
  return { item };
}

const reorderSchema = z.object({
  eventId: z.string().uuid(),
  order: z.array(z.string().uuid()),
});

export async function reorderMenuItems(eventId: string, order: string[]) {
  const supabase = createSupabaseServerClient();
  const parsed = reorderSchema.safeParse({ eventId, order });
  if (!parsed.success) return { error: "Invalid input" };

  await Promise.all(
    order.map((id, index) =>
      supabase
        .from("event_menu_items")
        .update({ position: (index + 1) * 10 })
        .eq("id", id)
        .eq("event_id", eventId),
    ),
  );

  revalidatePath("/catering", "layout");
  return { ok: true };
}

export async function deleteMenuItem(itemId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("event_menu_items")
    .delete()
    .eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}
