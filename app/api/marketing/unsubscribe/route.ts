import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { verifyUnsubToken } from "@/lib/server/marketing-send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One-click unsubscribe. Linked to from the List-Unsubscribe header and
 * from the email footer. Token is an HMAC of the subscriber id so a leaked
 * link only unsubs that one person.
 */
async function handle(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  const channel = req.nextUrl.searchParams.get("ch");
  const token = req.nextUrl.searchParams.get("t");
  if (!sid || !channel || !token || !verifyUnsubToken(sid, token)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const patch =
    channel === "sms"
      ? { opt_in_sms: false, opt_out_sms_at: now }
      : { opt_in_email: false, opt_out_email_at: now };
  await admin.from("marketing_subscribers").update(patch).eq("id", sid);

  return new NextResponse(
    `<!doctype html><html><head><title>Unsubscribed</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f6f4;">
<div style="max-width:420px;text-align:center;padding:32px;background:#fff;border-radius:12px;">
  <h1 style="margin:0 0 8px;">Unsubscribed</h1>
  <p style="color:#666;">You won't get ${channel === "sms" ? "texts" : "emails"} from Ditch anymore. Change your mind? Reply to any old message, or sign up again at eatatditch.com.</p>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
