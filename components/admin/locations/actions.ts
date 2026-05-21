"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { logActivity } from "@/lib/server/activity";

const slugRe = /^[a-z0-9_-]+$/;

const createSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(slugRe, "Lowercase letters, numbers, dashes, and underscores only"),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(9999).default(100),
});

export type CreateLocationInput = z.input<typeof createSchema>;

export async function createLocationAction(
  input: CreateLocationInput,
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.slug === "company_wide") {
    return { error: "Reserved slug" };
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("locations")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not create location" };
  }
  await logActivity({
    verb: "created",
    objectType: "location",
    objectId: data.id,
    summary: parsed.data.name,
  });
  revalidatePath("/admin/locations");
  return { id: data.id };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export type UpdateLocationInput = z.input<typeof updateSchema>;

export async function updateLocationAction(
  id: string,
  input: UpdateLocationInput,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const admin = createSupabaseAdminClient();
  // Don't let company_wide be deactivated — it's load-bearing.
  const { data: existing } = await admin
    .from("locations")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (existing?.slug === "company_wide" && !parsed.data.isActive) {
    return { error: "company_wide can't be deactivated" };
  }
  const { error } = await admin
    .from("locations")
    .update({
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  await logActivity({
    verb: "updated",
    objectType: "location",
    objectId: id,
    summary: parsed.data.name,
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}
