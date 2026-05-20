import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import {
  consumeOAuthState,
  exchangeCode,
  refreshAccountStatus,
} from "@/lib/stripe/connect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stripeError = url.searchParams.get("error");
  const stripeErrorDescription = url.searchParams.get("error_description");

  if (stripeError) {
    return NextResponse.redirect(
      new URL(
        `/catering/settings?stripe_error=${encodeURIComponent(
          stripeErrorDescription ?? stripeError,
        )}`,
        url.origin,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/catering/settings?stripe_error=missing_params", url.origin),
    );
  }

  const consumed = await consumeOAuthState(state);
  if (!consumed) {
    return NextResponse.redirect(
      new URL("/catering/settings?stripe_error=state_invalid", url.origin),
    );
  }

  let stripeUserId: string;
  try {
    const exchanged = await exchangeCode(code);
    stripeUserId = exchanged.stripeUserId;
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/catering/settings?stripe_error=${encodeURIComponent(
          e instanceof Error ? e.message : "exchange_failed",
        )}`,
        url.origin,
      ),
    );
  }

  let status: "active" | "onboarding" | "restricted" = "onboarding";
  let chargesEnabled = false;
  let payoutsEnabled = false;
  try {
    const fresh = await refreshAccountStatus(stripeUserId);
    status = fresh.status;
    chargesEnabled = fresh.chargesEnabled;
    payoutsEnabled = fresh.payoutsEnabled;
  } catch {
    /* fall through with onboarding state */
  }

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("catering_settings")
    .select("id")
    .eq("location_id", consumed.locationId)
    .maybeSingle();

  const payload = {
    stripe_account_id: stripeUserId,
    stripe_account_status: status,
    stripe_charges_enabled: chargesEnabled,
    stripe_payouts_enabled: payoutsEnabled,
    stripe_connected_at: new Date().toISOString(),
    stripe_disconnected_at: null,
  };

  let settingsId: string;
  if (existing) {
    await supabase
      .from("catering_settings")
      .update(payload)
      .eq("id", existing.id);
    settingsId = existing.id;
  } else {
    const { data: inserted } = await supabase
      .from("catering_settings")
      .insert({
        location_id: consumed.locationId,
        created_by: consumed.userId,
        ...payload,
      })
      .select("id")
      .single();
    settingsId = inserted?.id ?? "";
  }

  await logActivity({
    verb: "stripe_connected",
    objectType: "catering_settings",
    objectId: settingsId,
    summary: `Stripe Connect linked (${stripeUserId})`,
    locationId: consumed.locationId,
  });

  return NextResponse.redirect(
    new URL("/catering/settings?stripe_connected=1", url.origin),
  );
}
