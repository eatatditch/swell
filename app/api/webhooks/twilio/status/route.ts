import { type NextRequest, NextResponse } from "next/server";
import { validateRequest } from "twilio";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type { SendStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_MAP: Record<string, SendStatus> = {
  queued: "queued",
  accepted: "queued",
  scheduled: "queued",
  sending: "sending",
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
};

/**
 * Twilio status callback. Configure the URL on TWILIO_STATUS_CALLBACK_URL
 * env var (we pass it on every send). Twilio posts form-encoded.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature");
  const url = req.nextUrl.toString();
  if (authToken && signature) {
    const ok = validateRequest(authToken, signature, url, params);
    if (!ok) {
      return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    }
  }

  const sid = params["MessageSid"];
  const status = STATUS_MAP[params["MessageStatus"]];
  if (!sid || !status) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  const patch: Record<string, string | null> = { status };
  if (status === "delivered") patch.delivered_at = new Date().toISOString();
  if (status === "failed") patch.error_message = params["ErrorMessage"] ?? null;
  await admin
    .from("marketing_sends")
    .update(patch)
    .eq("provider_message_id", sid);

  return NextResponse.json({ ok: true });
}
