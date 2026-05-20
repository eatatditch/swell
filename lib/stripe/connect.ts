import "server-only";

import { randomBytes } from "node:crypto";

import {
  appUrl,
  getStripeClient,
  stripeConnectClientId,
} from "@/lib/stripe/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 10 minutes is the entire OAuth handshake budget.
const STATE_TTL_MS = 10 * 60 * 1000;

export function callbackUrl(): string {
  return `${appUrl()}/catering/settings/stripe/callback`;
}

export async function issueOAuthState(opts: {
  locationId: string;
  userId: string;
}): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

  const supabase = createSupabaseServerClient();
  await supabase.from("stripe_oauth_states").insert({
    state,
    location_id: opts.locationId,
    user_id: opts.userId,
    expires_at: expiresAt,
  });
  return state;
}

export async function consumeOAuthState(state: string): Promise<{
  locationId: string;
  userId: string;
} | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("stripe_oauth_states")
    .select("location_id, user_id, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (!data) return null;
  // Single-use token; delete immediately whether or not it's expired.
  await supabase.from("stripe_oauth_states").delete().eq("state", state);
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { locationId: data.location_id, userId: data.user_id };
}

export function buildAuthorizeUrl(state: string): string {
  const clientId = stripeConnectClientId();
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID is not set");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: callbackUrl(),
    state,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  stripeUserId: string;
}> {
  const stripe = getStripeClient();
  const resp = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });
  if (!resp.stripe_user_id) {
    throw new Error("Stripe did not return a connected account id");
  }
  return { stripeUserId: resp.stripe_user_id };
}

export async function refreshAccountStatus(stripeAccountId: string): Promise<{
  status: "active" | "onboarding" | "restricted";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;
  const detailsSubmitted = !!account.details_submitted;
  let status: "active" | "onboarding" | "restricted";
  if (chargesEnabled && payoutsEnabled) status = "active";
  else if (detailsSubmitted) status = "restricted";
  else status = "onboarding";
  return { status, chargesEnabled, payoutsEnabled };
}

export async function disconnectAccount(stripeAccountId: string): Promise<void> {
  const stripe = getStripeClient();
  const clientId = stripeConnectClientId();
  if (!clientId) return;
  try {
    await stripe.oauth.deauthorize({
      client_id: clientId,
      stripe_user_id: stripeAccountId,
    });
  } catch {
    // If Stripe already considers it disconnected, fall through — we still
    // clear our local row.
  }
}
