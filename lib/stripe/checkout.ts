import "server-only";

import { appUrl, getStripeClient } from "@/lib/stripe/client";

export interface CreateCheckoutSessionInput {
  stripeAccountId: string;
  amountCents: number;
  currency: string;
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  customerEmail?: string | null;
  successPath?: string;
  cancelPath?: string;
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const stripe = getStripeClient();
  const base = appUrl();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: {
              name: `Invoice ${input.invoiceNumber}`,
              description: input.description.slice(0, 500),
            },
          },
        },
      ],
      customer_email: input.customerEmail ?? undefined,
      success_url:
        input.successPath ??
        `${base}/catering/invoices/${input.invoiceId}?paid=1`,
      cancel_url:
        input.cancelPath ??
        `${base}/catering/invoices/${input.invoiceId}?canceled=1`,
      metadata: {
        swell_invoice_id: input.invoiceId,
        swell_invoice_number: input.invoiceNumber,
      },
      payment_intent_data: {
        metadata: {
          swell_invoice_id: input.invoiceId,
          swell_invoice_number: input.invoiceNumber,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    },
    { stripeAccount: input.stripeAccountId },
  );

  return {
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    url: session.url ?? "",
    expiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
  };
}
