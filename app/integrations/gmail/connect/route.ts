import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import {
  buildAuthUrl,
  gmailOAuthConfigured,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Kicks off Gmail OAuth: mints a CSRF state token, stores it in
// google_oauth_states bound to the signed-in user, and redirects to
// Google's authorize endpoint. State is consumed in /callback.
export async function GET(request: Request) {
  if (!gmailOAuthConfigured()) {
    return redirectToSettings(request, "config_missing");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(24).toString("base64url");
  const admin = createSupabaseAdminClient();
  const { error: insErr } = await admin.from("google_oauth_states").insert({
    state,
    user_id: user.id,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (insErr) {
    return redirectToSettings(request, "state_error");
  }

  return NextResponse.redirect(buildAuthUrl(state));
}

function redirectToSettings(request: Request, reason: string) {
  const url = new URL("/catering/integrations", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
