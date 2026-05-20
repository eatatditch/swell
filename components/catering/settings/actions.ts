"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import {
  buildAuthorizeUrl,
  disconnectAccount,
  issueOAuthState,
  refreshAccountStatus,
} from "@/lib/stripe/connect";
import { stripeConfigured } from "@/lib/stripe/client";

const stringy = z.string().trim();

const settingsSchema = z.object({
  locationId: z.string().uuid().optional().nullable(),
  defaultTaxRateBps: z.number().int().min(0).max(100_000),
  defaultGratuityRateBps: z.number().int().min(0).max(100_000),
  defaultDepositPercentBps: z.number().int().min(0).max(100_000),
  quoteTerms: stringy.max(20_000).optional().nullable(),
  invoiceTerms: stringy.max(20_000).optional().nullable(),
  replyToEmail: z.string().email().optional().or(z.literal("")).nullable(),
  senderName: stringy.max(200).optional().nullable(),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function upsertSettings(raw: SettingsInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Look for an existing row for this location.
  let query = supabase.from("catering_settings").select("id");
  if (v.locationId) query = query.eq("location_id", v.locationId);
  else query = query.is("location_id", null);
  const { data: existing } = await query.maybeSingle();

  const payload = {
    location_id: v.locationId ?? null,
    default_tax_rate_bps: v.defaultTaxRateBps,
    default_gratuity_rate_bps: v.defaultGratuityRateBps,
    default_deposit_percent_bps: v.defaultDepositPercentBps,
    quote_terms: v.quoteTerms || null,
    invoice_terms: v.invoiceTerms || null,
    reply_to_email: v.replyToEmail || null,
    sender_name: v.senderName || null,
  };

  if (existing) {
    const { error } = await supabase
      .from("catering_settings")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("catering_settings").insert({
      ...payload,
      created_by: user.id,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/catering/settings");
  return { ok: true };
}

export async function startStripeConnect(locationId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { configured, missing } = stripeConfigured();
  if (!configured) {
    return {
      error: `Stripe not configured. Missing env: ${missing.join(", ")}`,
    };
  }

  const state = await issueOAuthState({ locationId, userId: user.id });
  return { url: buildAuthorizeUrl(state) };
}

export async function disconnectStripe(locationId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: settings } = await supabase
    .from("catering_settings")
    .select("id, stripe_account_id")
    .eq("location_id", locationId)
    .maybeSingle();
  if (!settings?.stripe_account_id) {
    return { error: "Location is not connected to Stripe" };
  }

  try {
    await disconnectAccount(settings.stripe_account_id);
  } catch {
    /* fall through and clear local state */
  }

  await supabase
    .from("catering_settings")
    .update({
      stripe_account_id: null,
      stripe_account_status: "disconnected",
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_disconnected_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  await logActivity({
    verb: "stripe_disconnected",
    objectType: "catering_settings",
    objectId: settings.id,
    summary: "Stripe Connect disconnected",
    locationId,
  });

  revalidatePath("/catering/settings");
  return { ok: true };
}

export async function refreshStripeStatus(locationId: string) {
  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("catering_settings")
    .select("id, stripe_account_id")
    .eq("location_id", locationId)
    .maybeSingle();
  if (!settings?.stripe_account_id) {
    return { error: "Not connected" };
  }
  try {
    const status = await refreshAccountStatus(settings.stripe_account_id);
    await supabase
      .from("catering_settings")
      .update({
        stripe_account_status: status.status,
        stripe_charges_enabled: status.chargesEnabled,
        stripe_payouts_enabled: status.payoutsEnabled,
      })
      .eq("id", settings.id);
    revalidatePath("/catering/settings");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refresh failed" };
  }
}
