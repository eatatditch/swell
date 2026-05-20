import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import {
  extractBodies,
  fetchGmailMessage,
  fetchGmailProfile,
  header,
  listGmailHistory,
  parseAddress,
  parseAddressList,
  type GmailMessageDetail,
} from "@/lib/google/gmail";
import type { GmailAccount } from "@/lib/types/database";

interface SyncResult {
  accountId: string;
  email: string;
  fetched: number;
  saved: number;
  error?: string;
}

// Pulls new mail for a single Gmail account and persists matching messages
// to email_messages. Matches by contact email (sender or recipient). If no
// catering_contact matches, the message is skipped (we don't want every
// inbox message clogging up the catering UI).
export async function syncGmailAccount(
  account: GmailAccount,
): Promise<SyncResult> {
  const admin = createSupabaseAdminClient();
  const result: SyncResult = {
    accountId: account.id,
    email: account.email,
    fetched: 0,
    saved: 0,
  };

  try {
    // First sync: seed the history_id from the live profile and skip
    // backfilling old mail (we'd risk hammering Gmail and importing junk).
    if (!account.history_id) {
      const profile = await fetchGmailProfile(account);
      await admin
        .from("gmail_accounts")
        .update({
          history_id: profile.historyId,
          last_synced_at: new Date().toISOString(),
          status: "active",
          last_error: null,
        })
        .eq("id", account.id);
      return result;
    }

    let history = await listGmailHistory(account, account.history_id);

    if (history.expired) {
      // history_id was older than ~7 days; reseed.
      const profile = await fetchGmailProfile(account);
      await admin
        .from("gmail_accounts")
        .update({
          history_id: profile.historyId,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", account.id);
      return result;
    }

    result.fetched = history.newMessageIds.length;

    // Build contact lookup once per sync.
    const contactByEmail = await loadContactLookup(admin);

    for (const messageId of history.newMessageIds) {
      try {
        const detail = await fetchGmailMessage(account, messageId);
        const saved = await saveMessage({
          admin,
          account,
          detail,
          contactByEmail,
        });
        if (saved) result.saved += 1;
      } catch (err) {
        console.error(
          `[gmail-sync] skip message ${messageId} for ${account.email}:`,
          err,
        );
      }
    }

    await admin
      .from("gmail_accounts")
      .update({
        history_id: history.latestHistoryId ?? account.history_id,
        last_synced_at: new Date().toISOString(),
        status: "active",
        last_error: null,
      })
      .eq("id", account.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
    await admin
      .from("gmail_accounts")
      .update({
        status: msg.includes("401") ? "expired" : "error",
        last_error: msg.slice(0, 1000),
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }

  return result;
}

async function loadContactLookup(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<Map<string, { id: string }>> {
  const { data } = await admin
    .from("catering_contacts")
    .select("id, email")
    .not("email", "is", null);
  const map = new Map<string, { id: string }>();
  for (const row of data ?? []) {
    if (row.email) map.set(row.email.toLowerCase(), { id: row.id });
  }
  return map;
}

interface SaveMessageArgs {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  account: GmailAccount;
  detail: GmailMessageDetail;
  contactByEmail: Map<string, { id: string }>;
}

// Persist a fetched message if it touches one of our catering contacts.
// Returns true if a row was written (or already existed), false if skipped.
export async function saveMessage(args: SaveMessageArgs): Promise<boolean> {
  const { admin, account, detail, contactByEmail } = args;

  const fromHeader = header(detail.payload.headers, "From");
  const toHeader = header(detail.payload.headers, "To");
  const ccHeader = header(detail.payload.headers, "Cc");
  const bccHeader = header(detail.payload.headers, "Bcc");
  const subject = header(detail.payload.headers, "Subject");

  const fromParsed = parseAddress(fromHeader);
  const to = parseAddressList(toHeader);
  const cc = parseAddressList(ccHeader);
  const bcc = parseAddressList(bccHeader);

  // Determine direction: if Gmail labelled it SENT (it's outbound) or the
  // From matches our account email.
  const isOutbound =
    detail.labelIds.includes("SENT") ||
    fromParsed.email?.toLowerCase() === account.email.toLowerCase();

  // Match a catering contact: for inbound, it's the From; for outbound, the
  // first To recipient.
  const matchEmails = isOutbound ? to : fromParsed.email ? [fromParsed.email] : [];
  let contactId: string | null = null;
  for (const candidate of matchEmails) {
    const hit = contactByEmail.get(candidate.toLowerCase());
    if (hit) {
      contactId = hit.id;
      break;
    }
  }

  // No contact match → skip (we don't want every random email in the inbox).
  if (!contactId) return false;

  // Find the most recent open lead for this contact so the thread renders
  // on the lead page automatically.
  const { data: lead } = await admin
    .from("catering_leads")
    .select("id, status, location_id")
    .eq("contact_id", contactId)
    .in("status", ["lead", "quote_sent", "follow_up", "booked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { text, html } = extractBodies(detail);
  const sentAt = detail.internalDate
    ? new Date(Number.parseInt(detail.internalDate, 10)).toISOString()
    : null;

  // Use upsert against the unique (account_id, google_message_id) index so
  // re-syncs are idempotent.
  const { error } = await admin
    .from("email_messages")
    .upsert(
      {
        account_id: account.id,
        google_message_id: detail.id,
        thread_id: detail.threadId,
        direction: isOutbound ? "outbound" : "inbound",
        from_email: fromParsed.email,
        from_name: fromParsed.name,
        to_emails: to,
        cc_emails: cc,
        bcc_emails: bcc,
        subject: subject ?? null,
        snippet: detail.snippet ?? null,
        body_text: text,
        body_html: html,
        labels: detail.labelIds,
        sent_at: sentAt,
        contact_id: contactId,
        lead_id: lead?.id ?? null,
      },
      { onConflict: "account_id,google_message_id" },
    );

  if (error) {
    throw new Error(`Persist failed: ${error.message}`);
  }
  return true;
}

// Used by the send action to immediately record an outbound message in
// email_messages, so the lead-detail thread updates before the next poll
// finds it.
export async function recordOutboundMessage(args: {
  account: GmailAccount;
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  leadId: string | null;
  contactId: string | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("email_messages").upsert(
    {
      account_id: args.account.id,
      google_message_id: args.messageId,
      thread_id: args.threadId,
      direction: "outbound",
      from_email: args.account.email,
      from_name: null,
      to_emails: [args.to],
      cc_emails: [],
      bcc_emails: [],
      subject: args.subject,
      snippet: args.bodyText.slice(0, 200),
      body_text: args.bodyText,
      body_html: args.bodyHtml,
      labels: ["SENT"],
      sent_at: new Date().toISOString(),
      contact_id: args.contactId,
      lead_id: args.leadId,
    },
    { onConflict: "account_id,google_message_id" },
  );
}
