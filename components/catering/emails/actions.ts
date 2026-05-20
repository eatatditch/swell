"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { sendGmailMessage } from "@/lib/google/gmail";
import { recordOutboundMessage } from "@/lib/server/email-sync";
import { logActivity } from "@/lib/server/activity";
import type { GmailAccount } from "@/lib/types/database";

const stringy = z.string().trim();

const sendSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: stringy.min(1).max(500),
  body: stringy.min(1).max(50_000),
  inReplyToMessageId: stringy.max(200).optional().nullable(),
  threadId: stringy.max(200).optional().nullable(),
});

export type SendLeadEmailInput = z.input<typeof sendSchema>;

// Sends an email FROM the signed-in user's connected Gmail TO a guest, and
// records the outbound message against this lead so the thread updates
// instantly (without waiting for the next poll).
export async function sendLeadEmail(raw: SendLeadEmailInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Must have a connected gmail.
  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!account) {
    return {
      error:
        "Connect Gmail in /catering/integrations before sending replies from Swell.",
    };
  }

  // Resolve the contact for this lead so we can stash contact_id alongside
  // the message — keeps the unified-by-contact view honest.
  const { data: lead } = await admin
    .from("catering_leads")
    .select("id, contact_id, location_id")
    .eq("id", v.leadId)
    .maybeSingle();

  let sent;
  try {
    sent = await sendGmailMessage({
      account: account as GmailAccount,
      to: v.to,
      subject: v.subject,
      bodyText: v.body,
      // Render as plain text in the recipient's inbox. Markdown/HTML can
      // come later if it's worth the formatting complexity.
      threadId: v.threadId ?? undefined,
      inReplyToMessageId: v.inReplyToMessageId ?? undefined,
    });
  } catch (err) {
    console.error("[send-lead-email] gmail send failed:", err);
    const msg = err instanceof Error ? err.message : "Could not send email";
    return { error: msg };
  }

  await recordOutboundMessage({
    account: account as GmailAccount,
    messageId: sent.id,
    threadId: sent.threadId,
    to: v.to,
    subject: v.subject,
    bodyText: v.body,
    bodyHtml: null,
    leadId: v.leadId,
    contactId: lead?.contact_id ?? null,
  });

  await logActivity({
    verb: "emailed",
    objectType: "catering_lead",
    objectId: v.leadId,
    summary: v.subject,
    locationId: lead?.location_id ?? null,
  });

  revalidatePath(`/catering/leads/${v.leadId}`);
  return { ok: true, messageId: sent.id, threadId: sent.threadId };
}
