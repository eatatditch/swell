import { type NextRequest, NextResponse } from "next/server";
import { validateRequest } from "twilio";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STOP_WORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);
const START_WORDS = new Set(["START", "UNSTOP", "YES"]);

/**
 * Inbound SMS handler. Twilio TwiML expects a 200 with XML or empty body.
 * - "STOP"-type words → mark the subscriber opted-out of SMS.
 * - "START"-type words → opt back in.
 *
 * Configure as the messaging service's inbound webhook URL.
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

  const from = params["From"];
  const body = (params["Body"] ?? "").trim().toUpperCase();
  if (!from || !body) return emptyTwiml();

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (STOP_WORDS.has(body)) {
    await admin
      .from("marketing_subscribers")
      .update({ opt_in_sms: false, opt_out_sms_at: now })
      .eq("phone", from);
    return emptyTwiml(
      "<Response><Message>You're unsubscribed. Reply START to opt back in.</Message></Response>",
    );
  }
  if (START_WORDS.has(body)) {
    await admin
      .from("marketing_subscribers")
      .update({ opt_in_sms: true, opt_out_sms_at: null })
      .eq("phone", from);
    return emptyTwiml(
      "<Response><Message>You're back on the list. Reply STOP to opt out.</Message></Response>",
    );
  }

  return emptyTwiml();
}

function emptyTwiml(body = "<Response></Response>"): Response {
  return new Response(body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
