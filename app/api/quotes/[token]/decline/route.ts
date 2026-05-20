import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint: customer hits "Request changes" with a reason. We mark
// the quote declined AND synthesize an inbound email_messages row so the
// operator sees the request in their /catering/mail inbox (+ unread badge)
// and on the linked lead / contact / quote conversation threads.
export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body: { reason?: string } = {};
  try {
    body = (await request.json()) as { reason?: string };
  } catch {
    /* empty body is fine */
  }

  const reason = (body.reason ?? "").trim().slice(0, 2000);

  const admin = createSupabaseAdminClient();
  const { data: quote } = await admin
    .from("catering_quotes")
    .select(
      `id, quote_number, title, deposit_paid_at, declined_at, created_by,
       contact_id, lead_id, location_id,
       contact:catering_contacts!catering_quotes_contact_id_fkey(full_name, email)`,
    )
    .eq("accept_token", token)
    .maybeSingle();
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.deposit_paid_at) {
    return NextResponse.json(
      { error: "Deposit already paid — can't decline" },
      { status: 409 },
    );
  }

  await admin
    .from("catering_quotes")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason: reason || null,
    })
    .eq("id", quote.id);

  // Surface the request in the operator's inbox. Use the gmail account of
  // whoever sent the quote; fall back to any active account so the message
  // doesn't get lost.
  const contact = (
    quote as unknown as {
      contact: { full_name: string; email: string | null } | null;
    }
  ).contact;
  if (reason && contact) {
    type DeclineAccount = { id: string; email: string };
    let account: DeclineAccount | null = null;
    if (quote.created_by) {
      const { data } = await admin
        .from("gmail_accounts")
        .select("id, email")
        .eq("user_id", quote.created_by)
        .eq("status", "active")
        .maybeSingle();
      if (data) account = data as DeclineAccount;
    }
    if (!account) {
      const { data } = await admin
        .from("gmail_accounts")
        .select("id, email")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (data) account = data as DeclineAccount;
    }

    if (account) {
      const syntheticId = `swell-quote-decline-${quote.id}-${Date.now()}`;
      await admin.from("email_messages").insert({
        account_id: account.id,
        google_message_id: syntheticId,
        thread_id: syntheticId,
        direction: "inbound",
        from_email: contact.email,
        from_name: contact.full_name,
        to_emails: [account.email],
        cc_emails: [],
        bcc_emails: [],
        subject: `Changes requested — Quote ${quote.quote_number} (${quote.title})`,
        snippet: reason.slice(0, 200),
        body_text: reason,
        body_html: null,
        labels: ["INBOX", "SWELL_QUOTE_DECLINE"],
        sent_at: new Date().toISOString(),
        contact_id: quote.contact_id,
        lead_id: quote.lead_id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
