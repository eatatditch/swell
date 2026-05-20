import "server-only";

import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY;
const CONNECT_CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!SECRET) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.",
    );
  }
  if (!cached) {
    cached = new Stripe(SECRET, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return cached;
}

export function stripeConfigured(): {
  configured: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!SECRET) missing.push("STRIPE_SECRET_KEY");
  if (!CONNECT_CLIENT_ID) missing.push("STRIPE_CONNECT_CLIENT_ID");
  if (!WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  return { configured: missing.length === 0, missing };
}

export function stripeConnectClientId(): string | null {
  return CONNECT_CLIENT_ID ?? null;
}

export function stripeWebhookSecret(): string | null {
  return WEBHOOK_SECRET ?? null;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000"
  );
}
