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
  // At least one of contactId / leadId is required so the outbound mirror
  // can be filed under the right pipeline object.
  contactId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
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

  // Resolve a contact_id if only leadId was provided (and vice versa), and
  // a location_id for activity logging.
  let contactId: string | null = v.contactId ?? null;
  let locationId: string | null = null;
  if (v.leadId) {
    const { data: lead } = await admin
      .from("catering_leads")
      .select("contact_id, location_id")
      .eq("id", v.leadId)
      .maybeSingle();
    if (lead) {
      if (!contactId) contactId = lead.contact_id;
      locationId = lead.location_id;
    }
  }
  if (!contactId && !v.leadId) {
    return { error: "Provide a contact or a lead to attach this email to" };
  }

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
    leadId: v.leadId ?? null,
    contactId,
  });

  if (v.leadId) {
    await logActivity({
      verb: "emailed",
      objectType: "catering_lead",
      objectId: v.leadId,
      summary: v.subject,
      locationId,
    });
    revalidatePath(`/catering/leads/${v.leadId}`);
  } else if (contactId) {
    await logActivity({
      verb: "emailed",
      objectType: "catering_contact",
      objectId: contactId,
      summary: v.subject,
    });
    revalidatePath(`/catering/contacts/${contactId}`);
  }

  return { ok: true, messageId: sent.id, threadId: sent.threadId };
}
