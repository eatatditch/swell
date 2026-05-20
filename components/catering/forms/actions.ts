"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { defaultSchema, defaultSettings, slugify } from "@/lib/forms/schema";
import type { FormSchema, FormSettings } from "@/lib/types/database";

const stringy = z.string().trim();

const sourceChannelSchema = z.enum([
  "instagram",
  "website",
  "qr_code",
  "ad",
  "email",
  "referral",
  "partner",
  "other",
]);

const createSchema = z.object({
  name: stringy.min(1).max(200),
  locationId: z.string().uuid(),
  slug: stringy.max(64).optional().nullable(),
  description: stringy.max(2000).optional().nullable(),
  sourceChannel: sourceChannelSchema.optional(),
  sourceLabel: stringy.max(200).optional().nullable(),
});

export type CreateFormInput = z.input<typeof createSchema>;

export async function createLeadForm(raw: CreateFormInput) {
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

  const baseSlug = slugify(v.slug || v.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const { data: form, error } = await supabase
    .from("lead_forms")
    .insert({
      created_by: user.id,
      location_id: v.locationId,
      slug,
      name: v.name,
      description: v.description || null,
      schema: defaultSchema(),
      settings: defaultSettings(),
      source_channel: v.sourceChannel ?? "website",
      source_label: v.sourceLabel || null,
    })
    .select("*")
    .single();

  if (error || !form) {
    return { error: error?.message ?? "Could not create form" };
  }

  await logActivity({
    verb: "created",
    objectType: "lead_form",
    objectId: form.id,
    summary: form.name,
    locationId: form.location_id,
  });

  revalidatePath("/catering/forms");
  return { form };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: stringy.min(1).max(200).optional(),
  slug: stringy.max(64).optional(),
  description: stringy.max(2000).optional().nullable(),
  active: z.boolean().optional(),
  schema: z.unknown().optional(),
  settings: z.unknown().optional(),
  sourceChannel: sourceChannelSchema.optional(),
  sourceLabel: stringy.max(200).optional().nullable(),
});

export type UpdateFormInput = z.input<typeof updateSchema>;

export async function updateLeadForm(raw: UpdateFormInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const update: Record<string, unknown> = {};
  if (v.name !== undefined) update.name = v.name;
  if (v.description !== undefined) update.description = v.description || null;
  if (v.active !== undefined) update.active = v.active;
  if (v.schema !== undefined) update.schema = v.schema as FormSchema;
  if (v.settings !== undefined) update.settings = v.settings as FormSettings;
  if (v.sourceChannel !== undefined) update.source_channel = v.sourceChannel;
  if (v.sourceLabel !== undefined) update.source_label = v.sourceLabel || null;

  if (v.slug !== undefined) {
    const baseSlug = slugify(v.slug);
    if (!baseSlug) return { error: "Slug must contain letters or numbers" };
    update.slug = await ensureUniqueSlug(baseSlug, v.id);
  }

  const { data: form, error } = await supabase
    .from("lead_forms")
    .update(update)
    .eq("id", v.id)
    .select("*")
    .single();

  if (error || !form) {
    return { error: error?.message ?? "Could not update form" };
  }

  await logActivity({
    verb: "updated",
    objectType: "lead_form",
    objectId: form.id,
    summary: form.name,
    locationId: form.location_id,
  });

  revalidatePath("/catering/forms");
  revalidatePath(`/catering/forms/${form.id}`);
  return { form };
}

export async function deleteLeadForm(formId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: form } = await supabase
    .from("lead_forms")
    .select("id, name, location_id")
    .eq("id", formId)
    .maybeSingle();
  if (!form) return { error: "Form not found" };

  const { error } = await supabase.from("lead_forms").delete().eq("id", formId);
  if (error) return { error: error.message };

  await logActivity({
    verb: "deleted",
    objectType: "lead_form",
    objectId: form.id,
    summary: form.name,
    locationId: form.location_id,
  });

  revalidatePath("/catering/forms");
  return { ok: true };
}

async function ensureUniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const supabase = createSupabaseServerClient();
  let candidate = base || "form";
  let suffix = 1;
  // Loop until we find a slug not already taken (case-insensitive).
  while (true) {
    let q = supabase
      .from("lead_forms")
      .select("id")
      .ilike("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
