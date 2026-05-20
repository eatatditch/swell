import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { encryptToken, tokenEncryptionConfigured } from "@/lib/google/crypto";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  gmailOAuthConfigured,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Handles the redirect from Google. Validates the state token against the
// signed-in user, exchanges the auth code for tokens, encrypts and stores
// them, and bounces back to /catering/integrations.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  if (errParam) return back(request, errParam);
  if (!code || !state) return back(request, "missing_params");
  if (!gmailOAuthConfigured()) return back(request, "config_missing");
  if (!tokenEncryptionConfigured()) return back(request, "encryption_missing");

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const admin = createSupabaseAdminClient();

  // State must exist, be unconsumed, not expired, and bound to this user.
  const { data: stateRow } = await admin
    .from("google_oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();

  if (
    !stateRow ||
    stateRow.user_id !== user.id ||
    stateRow.consumed_at ||
    new Date(stateRow.expires_at).getTime() < Date.now()
  ) {
    return back(request, "invalid_state");
  }

  // Burn the state so it can't be replayed.
  await admin
    .from("google_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state", state);

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch {
    return back(request, "token_exchange_failed");
  }

  if (!tokens.refresh_token) {
    // Google only ships a refresh token on first consent. Without it we
    // can't sync long-term, so make the user re-consent.
    return back(request, "no_refresh_token");
  }

  let info;
  try {
    info = await fetchUserInfo(tokens.access_token);
  } catch {
    return back(request, "userinfo_failed");
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const scopes = tokens.scope ? tokens.scope.split(/\s+/) : [];

  // Upsert by (user_id, lower(email)). If the same user reconnects the same
  // gmail, update the tokens; otherwise insert a new row.
  const { data: existing } = await admin
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id)
    .ilike("email", info.email)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    google_user_id: info.sub,
    email: info.email,
    access_token_enc: encryptToken(tokens.access_token),
    refresh_token_enc: encryptToken(tokens.refresh_token),
    token_expires_at: expiresAt,
    scopes,
    status: "active" as const,
    last_error: null,
  };

  if (existing) {
    await admin.from("gmail_accounts").update(payload).eq("id", existing.id);
  } else {
    await admin.from("gmail_accounts").insert(payload);
  }

  const redirect = new URL("/catering/integrations", request.url);
  redirect.searchParams.set("connected", "1");
  return NextResponse.redirect(redirect);
}

function back(request: Request, reason: string) {
  const url = new URL("/catering/integrations", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
