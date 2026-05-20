import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
  } catch (err) {
    console.error("[gmail-callback] token exchange failed:", err);
    return back(request, "token_exchange_failed");
  }

  if (!tokens.refresh_token) {
    // Google only ships a refresh token on first consent. Without it we
    // can't sync long-term, so make the user re-consent.
    console.warn("[gmail-callback] no refresh_token in response. scope:", tokens.scope);
    return back(request, "no_refresh_token");
  }

  let info;
  try {
    info = await fetchUserInfo(tokens.access_token);
  } catch (err) {
    console.error("[gmail-callback] userinfo failed:", err);
    return back(request, "userinfo_failed");
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const scopes = tokens.scope ? tokens.scope.split(/\s+/) : [];

  let payload;
  try {
    payload = {
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
  } catch (err) {
    console.error("[gmail-callback] token encryption failed:", err);
    return back(request, "encryption_failed");
  }

  // Upsert by (user_id, lower(email)). If the same user reconnects the same
  // gmail, update the tokens; otherwise insert a new row.
  const { data: existing } = await admin
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id)
    .ilike("email", info.email)
    .maybeSingle();

  let savedId: string | null = null;
  if (existing) {
    const { data: updated, error: updateErr } = await admin
      .from("gmail_accounts")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (updateErr || !updated) {
      console.error("[gmail-callback] update failed:", updateErr);
      return back(request, "db_write_failed");
    }
    savedId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("gmail_accounts")
      .insert(payload)
      .select("id")
      .single();
    if (insertErr || !inserted) {
      console.error("[gmail-callback] insert failed:", insertErr);
      return back(request, "db_write_failed");
    }
    savedId = inserted.id;
  }
  console.log(
    `[gmail-callback] saved account ${savedId} for ${info.email} (user ${user.id})`,
  );

  // Server components in /catering subtree cache the result of
  // getCurrentUserGmailAccount / listEmailsForLead. Invalidate so the next
  // navigation sees the new account row instead of the pre-connect cached
  // render.
  revalidatePath("/catering", "layout");

  const redirect = new URL("/catering/integrations", request.url);
  redirect.searchParams.set("connected", "1");
  return NextResponse.redirect(redirect);
}

function back(request: Request, reason: string) {
  const url = new URL("/catering/integrations", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
