"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { toE164 } from "@/lib/server/sms-twilio";

async function requireMarketer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role: string } | null)?.role;
  const ok =
    role === "founder_admin" ||
    role === "general_manager" ||
    role === "marketing_manager";
  if (!ok) return { supabase, userId: user.id, error: "Marketers only" as const };
  return { supabase, userId: user.id, error: null };
}

const subscriberSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  email: z.string().email("Bad email").optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  tags: z.array(z.string().max(40)).default([]),
  source: z.string().max(120).optional().nullable(),
  optInEmail: z.boolean().default(true),
  optInSms: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createSubscriber(
  raw: z.input<typeof subscriberSchema>,
) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = subscriberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const email = v.email?.trim().toLowerCase() || null;
  const phone = v.phone ? toE164(v.phone) : null;
  if (!email && !phone) {
    return { error: "Need at least an email or a phone number." };
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("marketing_subscribers").insert({
    created_by: ctx.userId,
    name: v.name?.trim() || null,
    email,
    phone,
    tags: v.tags.map((t) => t.trim()).filter(Boolean),
    source: v.source?.trim() || "manual",
    opt_in_email: !!email && v.optInEmail,
    opt_in_sms: !!phone && v.optInSms,
    notes: v.notes?.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/marketing/subscribers", "layout");
  return { ok: true };
}

const updateSchema = subscriberSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().default(true),
});

export async function updateSubscriber(raw: z.input<typeof updateSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const email = v.email?.trim().toLowerCase() || null;
  const phone = v.phone ? toE164(v.phone) : null;
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("marketing_subscribers")
    .update({
      name: v.name?.trim() || null,
      email,
      phone,
      tags: v.tags.map((t) => t.trim()).filter(Boolean),
      source: v.source?.trim() || null,
      opt_in_email: !!email && v.optInEmail,
      opt_in_sms: !!phone && v.optInSms,
      notes: v.notes?.trim() || null,
      is_active: v.isActive,
    })
    .eq("id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/marketing/subscribers", "layout");
  return { ok: true };
}

export async function deleteSubscriber(id: string) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("marketing_subscribers")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marketing/subscribers", "layout");
  return { ok: true };
}

const importSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  defaultTags: z.array(z.string().max(40)).default([]),
  defaultSource: z.string().max(120).optional().nullable(),
  optInEmail: z.boolean().default(true),
  optInSms: z.boolean().default(false),
});

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Import a CSV of subscribers. Expects headers (case-insensitive): name,
 * email, phone, tags (semicolon-separated). Conflicting emails/phones
 * upsert by appending tags + keeping the most-permissive opt-in state.
 */
export async function importSubscribersCsv(
  raw: z.input<typeof importSchema>,
): Promise<ImportResult | { error: string }> {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const rows = parseCsv(v.csv);
  if (rows.length === 0) return { error: "No rows found" };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const ix = (name: string) => header.indexOf(name);
  const colEmail = ix("email");
  const colPhone = ix("phone");
  const colName = ix("name");
  const colTags = ix("tags");
  if (colEmail < 0 && colPhone < 0) {
    return { error: "CSV needs an 'email' or 'phone' column." };
  }

  const admin = createSupabaseAdminClient();
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const email =
      colEmail >= 0 ? cells[colEmail]?.trim().toLowerCase() || null : null;
    const phoneRaw = colPhone >= 0 ? cells[colPhone]?.trim() : null;
    const phone = phoneRaw ? toE164(phoneRaw) : null;
    if (!email && !phone) {
      skipped += 1;
      continue;
    }
    const name = colName >= 0 ? cells[colName]?.trim() || null : null;
    const tagsList =
      colTags >= 0
        ? (cells[colTags] ?? "")
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    const tags = Array.from(new Set([...v.defaultTags, ...tagsList]));

    // Try to find an existing match by email or phone.
    let existingId: string | null = null;
    if (email) {
      const { data: e } = await admin
        .from("marketing_subscribers")
        .select("id, tags")
        .eq("email", email)
        .maybeSingle();
      if (e) {
        existingId = (e as { id: string }).id;
        const existingTags = (e as { tags: string[] }).tags ?? [];
        const mergedTags = Array.from(new Set([...existingTags, ...tags]));
        const { error: upErr } = await admin
          .from("marketing_subscribers")
          .update({
            tags: mergedTags,
            name: name ?? undefined,
            phone: phone ?? undefined,
            opt_in_email: v.optInEmail || undefined,
            opt_in_sms: phone && v.optInSms ? true : undefined,
            source: v.defaultSource ?? undefined,
            is_active: true,
          })
          .eq("id", existingId);
        if (upErr) {
          errors.push(`${email}: ${upErr.message}`);
        } else {
          updated += 1;
        }
        continue;
      }
    }
    if (!existingId && phone) {
      const { data: p } = await admin
        .from("marketing_subscribers")
        .select("id, tags")
        .eq("phone", phone)
        .maybeSingle();
      if (p) {
        existingId = (p as { id: string }).id;
        const existingTags = (p as { tags: string[] }).tags ?? [];
        const mergedTags = Array.from(new Set([...existingTags, ...tags]));
        const { error: upErr } = await admin
          .from("marketing_subscribers")
          .update({
            tags: mergedTags,
            name: name ?? undefined,
            email: email ?? undefined,
            opt_in_sms: v.optInSms || undefined,
            source: v.defaultSource ?? undefined,
            is_active: true,
          })
          .eq("id", existingId);
        if (upErr) {
          errors.push(`${phone}: ${upErr.message}`);
        } else {
          updated += 1;
        }
        continue;
      }
    }

    const { error: insErr } = await admin
      .from("marketing_subscribers")
      .insert({
        created_by: ctx.userId,
        name,
        email,
        phone,
        tags,
        source: v.defaultSource ?? "csv import",
        opt_in_email: !!email && v.optInEmail,
        opt_in_sms: !!phone && v.optInSms,
      });
    if (insErr) {
      errors.push(`${email ?? phone}: ${insErr.message}`);
    } else {
      inserted += 1;
    }
  }

  revalidatePath("/marketing/subscribers", "layout");
  return { inserted, updated, skipped, errors: errors.slice(0, 20) };
}

// Minimal CSV parser supporting double-quoted fields with embedded commas.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) out.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) out.push(row);
  }
  return out;
}
