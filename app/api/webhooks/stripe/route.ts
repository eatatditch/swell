import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import {
  getStripeClient,
  stripeWebhookSecret,
} from "@/lib/stripe/client";
import { refreshAccountStatus } from "@/lib/stripe/connect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    return new NextResponse("Stripe webhook secret not configured", {
      status: 500,
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    return new NextResponse(
      `Webhook signature verification failed: ${
        e instanceof Error ? e.message : "unknown"
      }`,
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleCheckoutFailed(event);
        break;
      case "account.updated":
        await handleAccountUpdated(event);
        break;
      default:
        break;
    }
  } catch (e) {
    return new NextResponse(
      `Handler error: ${e instanceof Error ? e.message : "unknown"}`,
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Public quote deposit path: metadata.swell_quote_id is set in
  // createQuoteDepositSession. Marks the quote as deposit-paid and stamps
  // the payment intent.
  const quoteId =
    (session.metadata?.swell_quote_id as string | undefined) ??
    (typeof session.payment_intent === "object" &&
    session.payment_intent &&
    "metadata" in session.payment_intent
      ? (session.payment_intent.metadata?.swell_quote_id as
          | string
          | undefined)
      : undefined);
  if (quoteId) {
    await handleQuoteDepositCompleted(event, session, quoteId);
    return;
  }

  const invoiceId =
    (session.metadata?.swell_invoice_id as string | undefined) ??
    (typeof session.payment_intent === "object" &&
    session.payment_intent &&
    "metadata" in session.payment_intent
      ? (session.payment_intent.metadata
          ?.swell_invoice_id as string | undefined)
      : undefined);
  if (!invoiceId) return;

  const supabase = createSupabaseServerClient();

  // Find the matching payment link row.
  const { data: link } = await supabase
    .from("catering_payment_links")
    .select("id, invoice_id, amount_cents, stripe_account_id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (!link) return;

  // Mark the payment link completed.
  await supabase
    .from("catering_payment_links")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    })
    .eq("id", link.id);

  // Look up invoice context so we can write a payment row tied to its event.
  const { data: invoice } = await supabase
    .from("catering_invoices")
    .select("id, invoice_number, event_id, location_id")
    .eq("id", link.invoice_id)
    .maybeSingle();
  if (!invoice) return;

  // Idempotency: skip if we already have a payment row for this session.
  const { data: existing } = await supabase
    .from("event_payments")
    .select("id")
    .eq("reference", session.id)
    .maybeSingle();

  if (!existing && invoice.event_id) {
    await supabase.from("event_payments").insert({
      event_id: invoice.event_id,
      invoice_id: invoice.id,
      kind: "balance",
      status: "received",
      method: "card",
      amount_cents: link.amount_cents,
      reference: session.id,
      notes: "Stripe checkout",
      paid_at: new Date(event.created * 1000).toISOString(),
    });
  }

  // Recompute invoice amount_paid + status (mirrors actions.ts helper).
  const { data: pays } = await supabase
    .from("event_payments")
    .select("amount_cents, kind, status")
    .eq("invoice_id", invoice.id);
  let paid = 0;
  for (const p of (pays ?? []) as {
    amount_cents: number;
    kind: string;
    status: string;
  }[]) {
    if (p.kind === "refund" || p.status === "refunded") paid -= p.amount_cents;
    else if (p.status === "received") paid += p.amount_cents;
  }
  paid = Math.max(0, paid);

  const { data: inv } = await supabase
    .from("catering_invoices")
    .select("total_cents, status")
    .eq("id", invoice.id)
    .single();
  const update: Record<string, unknown> = { amount_paid_cents: paid };
  if (inv) {
    if (paid >= inv.total_cents && inv.total_cents > 0) {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
    } else if (paid > 0 && inv.status !== "void") {
      update.status = "partially_paid";
    }
  }
  await supabase.from("catering_invoices").update(update).eq("id", invoice.id);

  await logActivity({
    verb: "paid",
    objectType: "catering_invoice",
    objectId: invoice.id,
    summary: `${invoice.invoice_number}: Stripe payment received`,
    locationId: invoice.location_id,
    metadata: {
      amount_cents: link.amount_cents,
      stripe_session_id: session.id,
    },
  });
}

async function handleCheckoutFailed(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = createSupabaseServerClient();
  await supabase
    .from("catering_payment_links")
    .update({
      status: event.type === "checkout.session.expired" ? "expired" : "failed",
    })
    .eq("stripe_session_id", session.id);
}

async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  const supabase = createSupabaseServerClient();
  try {
    const fresh = await refreshAccountStatus(account.id);
    await supabase
      .from("catering_settings")
      .update({
        stripe_account_status: fresh.status,
        stripe_charges_enabled: fresh.chargesEnabled,
        stripe_payouts_enabled: fresh.payoutsEnabled,
      })
      .eq("stripe_account_id", account.id);
  } catch {
    /* nothing to do */
  }
}

async function handleQuoteDepositCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  quoteId: string,
) {
  const supabase = createSupabaseServerClient();
  const paidAt = new Date(event.created * 1000).toISOString();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await supabase
    .from("catering_quotes")
    .update({
      accepted_at: paidAt,
      deposit_paid_at: paidAt,
      deposit_payment_intent_id: paymentIntentId,
      status: "accepted",
    })
    .eq("id", quoteId);

  await logActivity({
    verb: "deposit_paid",
    objectType: "catering_quote",
    objectId: quoteId,
    summary: `Deposit received via Stripe`,
    metadata: {
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
  });
}
