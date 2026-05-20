import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { syncGmailAccount } from "@/lib/server/email-sync";
import { parsePubsubPushBody, verifyPubsubJWT } from "@/lib/google/pubsub";
import type { GmailAccount } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint — Google Pub/Sub pushes here with an OIDC bearer token.
// We verify the JWT against Google's JWKS, decode the Gmail notification,
// look up the matching gmail_accounts row, and sync immediately. Total
// latency from "customer sends mail" to "row in email_messages" is
// ~1-3 seconds in practice.
//
// Pub/Sub retries on non-2xx for up to 7 days, so failures here surface in
// Vercel logs but don't lose mail — the next push or the 5-min cron will
// pick it up.
export async function POST(request: Request) {
  // 1. Auth: OIDC bearer from Pub/Sub.
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer" }, { status: 401 });
  }
  try {
    await verifyPubsubJWT(token);
  } catch (err) {
    console.error("[gmail-pubsub] JWT verify failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Parse the wrapped Gmail notification.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const notif = parsePubsubPushBody(body);
  if (!notif) {
    // Pub/Sub sometimes delivers empty messages for heartbeat/test traffic.
    // Returning 200 keeps the subscription healthy without re-delivery.
    return NextResponse.json({ ok: true, skip: "no_data" });
  }

  // 3. Locate the gmail_accounts row for this inbox.
  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from("gmail_accounts")
    .select("*")
    .ilike("email", notif.emailAddress)
    .eq("status", "active")
    .maybeSingle();
  if (!account) {
    // Unknown inbox — probably a disconnected account whose watch hasn't
    // expired yet. Ack so Pub/Sub stops retrying.
    return NextResponse.json({ ok: true, skip: "unknown_account" });
  }

  // 4. Sync. syncGmailAccount uses our stored history_id rather than the
  // notification's, which means we pick up *any* messages since the last
  // sync — handy if Pub/Sub was briefly down.
  const result = await syncGmailAccount(account as GmailAccount);

  return NextResponse.json({ ok: true, ...result });
}
