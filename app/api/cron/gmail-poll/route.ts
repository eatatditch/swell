import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { syncGmailAccount } from "@/lib/server/email-sync";
import { watchGmailAccount } from "@/lib/google/gmail";
import { pubsubConfigured, pubsubTopic } from "@/lib/google/pubsub";
import type { GmailAccount } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Up to 60s per invocation — long enough to walk a handful of accounts but
// short enough to avoid runaway costs on hostile inboxes.
export const maxDuration = 60;

// Triggered by Vercel cron every few minutes (see vercel.json). Walks every
// active gmail_accounts row and pulls new mail since each account's stored
// history_id, persisting any messages that touch a known catering_contact.
export async function GET(request: Request) {
  // Vercel sets x-vercel-cron when invoking a cron. Also accept a manual
  // bearer token (CRON_SECRET) so we can poke this from a terminal.
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const isManual = expected && auth === expected;
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: accounts } = await admin
    .from("gmail_accounts")
    .select("*")
    .in("status", ["active", "error"])
    .limit(50);

  const results = [];
  const renewWindowMs = 24 * 60 * 60 * 1000; // refresh watch when <24h left
  for (const account of (accounts ?? []) as GmailAccount[]) {
    // Renew Gmail watch when it's expiring soon (or missing entirely on an
    // active account). Cheap: one API call per account, only when needed.
    if (pubsubConfigured()) {
      const expiresAt = account.watch_expires_at
        ? new Date(account.watch_expires_at).getTime()
        : 0;
      if (!expiresAt || expiresAt - Date.now() < renewWindowMs) {
        try {
          const watch = await watchGmailAccount(account, pubsubTopic());
          await admin
            .from("gmail_accounts")
            .update({
              watch_history_id: watch.historyId,
              watch_expires_at: new Date(
                Number.parseInt(watch.expiration, 10),
              ).toISOString(),
            })
            .eq("id", account.id);
        } catch (err) {
          console.error(
            `[gmail-cron] watch renew failed for ${account.email}:`,
            err,
          );
        }
      }
    }
    results.push(await syncGmailAccount(account));
  }

  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    accounts: results,
  });
}
