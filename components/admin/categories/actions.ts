"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

const slugRe = /^[a-z0-9_-]+$/;

const createSchema = z.object({
  module: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).regex(slugRe),
  sortOrder: z.number().int().min(0).max(9999).default(100),
});

export type CreateCategoryInput = z.input<typeof createSchema>;

export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("categories")
    .insert({
      module: parsed.data.module,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not create category" };
  }
  revalidatePath("/admin/categories");
  return { id: data.id };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(9999),
});

export type UpdateCategoryInput = z.input<typeof updateSchema>;

export async function updateCategoryAction(
  id: string,
  input: UpdateCategoryInput,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("categories")
    .update({
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}
