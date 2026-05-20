import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { createQuoteDepositSession } from "@/lib/stripe/checkout";
import { appUrl } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint: customer clicks "Accept & pay deposit" on the public quote
// view. We mint a Stripe Checkout session on the location's Connect account
// for the quote's deposit_required_cents (default $500) and return the URL.
// The Stripe webhook flips the quote into accepted + deposit_paid state when
// the session completes.
export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: quote } = await admin
    .from("catering_quotes")
    .select(
      `id, quote_number, title, total_cents, deposit_required_cents,
       location_id, accepted_at, declined_at, deposit_paid_at,
       contact:catering_contacts!catering_quotes_contact_id_fkey(email)`,
    )
    .eq("accept_token", token)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.deposit_paid_at) {
    return NextResponse.json(
      { error: "Deposit already paid for this quote" },
      { status: 409 },
    );
  }
  if (quote.declined_at) {
    return NextResponse.json(
      { error: "This quote was declined and can't be accepted" },
      { status: 409 },
    );
  }

  // Resolve the location's connected Stripe account.
  const { data: settings } = await admin
    .from("catering_settings")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("location_id", quote.location_id)
    .maybeSingle();
  if (!settings?.stripe_account_id || !settings.stripe_charges_enabled) {
    return NextResponse.json(
      {
        error:
          "This location can't accept deposits yet — Stripe isn't connected.",
      },
      { status: 503 },
    );
  }

  const contactEmail =
    (quote as unknown as { contact: { email: string | null } | null }).contact
      ?.email ?? null;

  const host = appUrl().replace(/\/$/, "");
  const depositCents = quote.deposit_required_cents || 50000;

  try {
    const session = await createQuoteDepositSession({
      stripeAccountId: settings.stripe_account_id,
      amountCents: depositCents,
      currency: "usd",
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      quoteTitle: quote.title,
      customerEmail: contactEmail,
      successPath: `${host}/q/${encodeURIComponent(token)}/paid`,
      cancelPath: `${host}/q/${encodeURIComponent(token)}?canceled=1`,
    });

    // Mark the quote as accepted now — actual payment confirmation comes
    // from the webhook (which sets deposit_paid_at and the PI id).
    await admin
      .from("catering_quotes")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[quote-accept] checkout creation failed:", err);
    const msg =
      err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
