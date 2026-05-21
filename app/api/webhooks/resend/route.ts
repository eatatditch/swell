import { type NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type { SendStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ResendEvent {
  type: string;
  created_at: string;
  data?: {
    email_id?: string;
    to?: string[];
  };
}

const EVENT_MAP: Record<string, { status: SendStatus; stamp?: string }> = {
  "email.delivered": { status: "delivered", stamp: "delivered_at" },
  "email.bounced": { status: "bounced" },
  "email.opened": { status: "opened", stamp: "opened_at" },
  "email.clicked": { status: "clicked", stamp: "clicked_at" },
  "email.complained": { status: "complained" },
  "email.delivery_delayed": { status: "sent" },
  "email.failed": { status: "failed" },
};

/**
 * Resend posts here on every email event. We map the provider event to
 * one of our SendStatus values and stamp the matching timestamp.
 *
 * Configure the URL in the Resend dashboard, and add the signing secret
 * to RESEND_WEBHOOK_SECRET. We use svix (the lib Resend signs with) to
 * verify the signature.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(raw, {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      });
    } catch {
      return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const mapped = EVENT_MAP[event.type];
  if (!mapped || !event.data?.email_id) {
    return NextResponse.json({ ok: true });
  }

  const admin = createSupabaseAdminClient();
  const patch: Record<string, string> = { status: mapped.status };
  if (mapped.stamp) patch[mapped.stamp] = event.created_at;
  await admin
    .from("marketing_sends")
    .update(patch)
    .eq("provider_message_id", event.data.email_id);

  return NextResponse.json({ ok: true });
}
