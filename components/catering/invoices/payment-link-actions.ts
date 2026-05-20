"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { stripeConfigured } from "@/lib/stripe/client";
import { createCheckoutSession } from "@/lib/stripe/checkout";

const schema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().min(0.5).max(10_000_000).optional(),
});

export async function createInvoicePaymentLink(raw: z.input<typeof schema>) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { configured, missing } = stripeConfigured();
  if (!configured) {
    return {
      error: `Stripe not configured. Missing env: ${missing.join(", ")}`,
    };
  }

  const { data: invoice } = await supabase
    .from("catering_invoices")
    .select(
      "id, invoice_number, title, total_cents, balance_cents, location_id, contact:catering_contacts!catering_invoices_contact_id_fkey(email)",
    )
    .eq("id", v.invoiceId)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };

  if (!invoice.location_id) {
    return {
      error: "Invoice needs a location to determine which Stripe account to charge.",
    };
  }

  const { data: settings } = await supabase
    .from("catering_settings")
    .select("stripe_account_id, stripe_account_status, stripe_charges_enabled")
    .eq("location_id", invoice.location_id)
    .maybeSingle();

  if (!settings?.stripe_account_id) {
    return {
      error:
        "This location isn't connected to Stripe yet. Connect it in Settings.",
    };
  }
  if (!settings.stripe_charges_enabled) {
    return {
      error:
        "Stripe account isn't enabled for charges yet. Finish onboarding in Settings.",
    };
  }

  const amountCents = Math.round((v.amount ?? 0) * 100) || invoice.balance_cents;
  if (amountCents <= 0) {
    return { error: "Nothing to charge — invoice is fully paid." };
  }

  const contact = (
    invoice as unknown as { contact: { email: string | null } | null }
  ).contact;

  let session;
  try {
    session = await createCheckoutSession({
      stripeAccountId: settings.stripe_account_id,
      amountCents,
      currency: "usd",
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      description: invoice.title,
      customerEmail: contact?.email ?? null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Stripe rejected the request" };
  }

  const { data: link, error } = await supabase
    .from("catering_payment_links")
    .insert({
      created_by: user.id,
      invoice_id: invoice.id,
      stripe_session_id: session.sessionId,
      stripe_payment_intent_id: session.paymentIntentId,
      stripe_account_id: settings.stripe_account_id,
      amount_cents: amountCents,
      currency: "usd",
      url: session.url,
      expires_at: session.expiresAt,
    })
    .select("*")
    .single();

  if (error || !link) {
    return { error: error?.message ?? "Could not record payment link" };
  }

  await logActivity({
    verb: "payment_link_created",
    objectType: "catering_invoice",
    objectId: invoice.id,
    summary: `${invoice.invoice_number}: $${(amountCents / 100).toFixed(2)} payment link`,
    locationId: invoice.location_id,
    metadata: { amount_cents: amountCents },
  });

  revalidatePath(`/catering/invoices/${invoice.id}`);
  return { link };
}
