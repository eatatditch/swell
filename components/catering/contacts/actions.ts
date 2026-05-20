"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";

const stringy = z.string().trim();

const baseSchema = z.object({
  fullName: stringy.min(1, "Name required").max(200),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: stringy.max(64).optional().nullable(),
  company: stringy.max(200).optional().nullable(),
  title: stringy.max(200).optional().nullable(),
  address: stringy.max(500).optional().nullable(),
  city: stringy.max(200).optional().nullable(),
  state: stringy.max(64).optional().nullable(),
  postalCode: stringy.max(32).optional().nullable(),
  source: stringy.max(200).optional().nullable(),
  tags: z.array(stringy.max(64)).max(40).optional().default([]),
  notes: stringy.max(20_000).optional().nullable(),
});

export type CreateContactInput = z.input<typeof baseSchema>;

function toRow(v: z.infer<typeof baseSchema>) {
  return {
    full_name: v.fullName,
    email: v.email || null,
    phone: v.phone || null,
    company: v.company || null,
    title: v.title || null,
    address: v.address || null,
    city: v.city || null,
    state: v.state || null,
    postal_code: v.postalCode || null,
    source: v.source || null,
    tags: v.tags ?? [],
    notes: v.notes || null,
  };
}

export async function createCateringContact(raw: CreateContactInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data, error } = await supabase
    .from("catering_contacts")
    .insert({ created_by: user.id, ...toRow(parsed.data) })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create contact" };

  await logActivity({
    verb: "created",
    objectType: "catering_contact",
    objectId: data.id,
    summary: data.full_name,
  });

  revalidatePath("/catering/contacts");
  return { contact: data };
}

const updateSchema = baseSchema.extend({ id: z.string().uuid() });
export type UpdateContactInput = z.input<typeof updateSchema>;

export async function updateCateringContact(raw: UpdateContactInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...rest } = parsed.data;

  const { data, error } = await supabase
    .from("catering_contacts")
    .update(toRow(rest))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not update contact" };

  await logActivity({
    verb: "updated",
    objectType: "catering_contact",
    objectId: data.id,
    summary: data.full_name,
  });

  revalidatePath("/catering/contacts");
  revalidatePath(`/catering/contacts/${id}`);
  return { contact: data };
}

export async function deleteCateringContact(id: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Block delete if any lead or event still references this contact —
  // otherwise the FK SET NULL would orphan rows.
  const [{ count: leadCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from("catering_leads")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", id),
    supabase
      .from("catering_events")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", id),
  ]);
  if ((leadCount ?? 0) > 0 || (eventCount ?? 0) > 0) {
    return {
      error: "Contact has linked leads or events — unlink them first.",
    };
  }

  const { error } = await supabase
    .from("catering_contacts")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catering/contacts");
  return { ok: true };
}
