import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { decryptToken, encryptToken } from "@/lib/google/crypto";
import { refreshAccessToken } from "@/lib/google/oauth";
import type { GmailAccount } from "@/lib/types/database";

// =============================================================================
// Token freshness
// =============================================================================

// Refresh access token if it's within REFRESH_BUFFER_MS of expiring. Returns
// the live access token. Persists the new ciphertext + expiry.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getActiveAccessToken(
  account: Pick<
    GmailAccount,
    "id" | "access_token_enc" | "refresh_token_enc" | "token_expires_at"
  >,
): Promise<string> {
  if (
    account.token_expires_at &&
    new Date(account.token_expires_at).getTime() > Date.now() + REFRESH_BUFFER_MS
  ) {
    return decryptToken(account.access_token_enc);
  }

  const refresh = decryptToken(account.refresh_token_enc);
  const refreshed = await refreshAccessToken(refresh);
  const newExpiry = new Date(
    Date.now() + refreshed.expires_in * 1000,
  ).toISOString();
  const newAccessEnc = encryptToken(refreshed.access_token);

  const admin = createSupabaseAdminClient();
  await admin
    .from("gmail_accounts")
    .update({
      access_token_enc: newAccessEnc,
      token_expires_at: newExpiry,
    })
    .eq("id", account.id);

  return refreshed.access_token;
}

// =============================================================================
// Send
// =============================================================================

export interface SendMessageInput {
  account: GmailAccount;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  inReplyToMessageId?: string;
  threadId?: string;
}

export interface SentMessageRef {
  id: string;
  threadId: string;
}

export async function sendGmailMessage(
  input: SendMessageInput,
): Promise<SentMessageRef> {
  const accessToken = await getActiveAccessToken(input.account);

  const mime = buildMime({
    from: input.account.email,
    to: input.to,
    cc: input.cc ?? [],
    bcc: input.bcc ?? [],
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
    inReplyToMessageId: input.inReplyToMessageId,
  });

  const raw = base64UrlEncode(mime);

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw,
        threadId: input.threadId,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail send failed: ${res.status} ${body}`);
  }

  const sent = (await res.json()) as { id: string; threadId: string };
  return { id: sent.id, threadId: sent.threadId };
}

// Build a minimal RFC822 message. Gmail's parser is lenient — bare LF works.
// RFC 2047 encoded-word: any header value containing non-ASCII bytes gets
// wrapped as =?UTF-8?B?<base64>?=. Without this, em dashes / smart quotes
// / accented names render as mojibake (Ã¢Â€Â") in the recipient's inbox.
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

// "Jane Doe <jane@x.com>" → encode only the display-name half if needed.
function encodeAddress(addr: string): string {
  const m = /^(.+?)\s*<([^>]+)>$/.exec(addr);
  if (!m) return addr;
  const name = m[1].trim().replace(/^"|"$/g, "");
  return `${encodeHeaderValue(name)} <${m[2].trim()}>`;
}

function bodyAsBase64(body: string): string {
  // Encode as base64 with CRLF line breaks every 76 chars (RFC compliance).
  const b64 = Buffer.from(body, "utf8").toString("base64");
  return b64.replace(/(.{76})/g, "$1\r\n");
}

function buildMime(opts: {
  from: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  inReplyToMessageId?: string;
}): string {
  const headers: string[] = [];
  headers.push(`From: ${encodeAddress(opts.from)}`);
  headers.push(`To: ${opts.to.split(",").map((a) => encodeAddress(a.trim())).join(", ")}`);
  if (opts.cc.length)
    headers.push(`Cc: ${opts.cc.map(encodeAddress).join(", ")}`);
  if (opts.bcc.length)
    headers.push(`Bcc: ${opts.bcc.map(encodeAddress).join(", ")}`);
  headers.push(`Subject: ${encodeHeaderValue(opts.subject)}`);
  if (opts.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${opts.inReplyToMessageId}`);
    headers.push(`References: ${opts.inReplyToMessageId}`);
  }
  headers.push("MIME-Version: 1.0");

  if (opts.bodyHtml && opts.bodyText) {
    const boundary = `swell-${Math.random().toString(36).slice(2)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      bodyAsBase64(opts.bodyText),
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      bodyAsBase64(opts.bodyHtml),
      "",
      `--${boundary}--`,
    ].join("\r\n");
    return headers.join("\r\n") + "\r\n\r\n" + body;
  }

  const isHtml = !!opts.bodyHtml;
  headers.push(
    `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
  );
  headers.push("Content-Transfer-Encoding: base64");
  const rawBody = opts.bodyHtml ?? opts.bodyText ?? "";
  return headers.join("\r\n") + "\r\n\r\n" + bodyAsBase64(rawBody);
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// =============================================================================
// Receive — list + fetch messages
// =============================================================================

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string; // ms since epoch as string
  payload: {
    headers: GmailMessageHeader[];
    body?: { data?: string; size?: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size?: number };
      parts?: GmailMessageDetail["payload"]["parts"];
    }>;
    mimeType?: string;
  };
}

// =============================================================================
// Gmail Watch — Pub/Sub push subscription
// =============================================================================

export interface GmailWatchResult {
  historyId: string;
  expiration: string; // ms-epoch as string
}

// Start (or refresh) a Gmail push subscription for this account. Gmail will
// publish a notification to the configured Pub/Sub topic every time INBOX
// (or SENT) changes. The watch is valid up to 7 days and must be re-upped
// before then; the cron handles renewal when watch_expires_at < 24h.
export async function watchGmailAccount(
  account: GmailAccount,
  topicName: string,
): Promise<GmailWatchResult> {
  const accessToken = await getActiveAccessToken(account);
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX", "SENT"],
        labelFilterBehavior: "INCLUDE",
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail watch failed: ${res.status} ${body}`);
  }
  return (await res.json()) as GmailWatchResult;
}

// Tell Gmail to stop publishing for this account. Used on disconnect.
export async function stopGmailWatch(account: GmailAccount): Promise<void> {
  let accessToken: string;
  try {
    accessToken = await getActiveAccessToken(account);
  } catch {
    return; // refresh token already dead, nothing we can do
  }
  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Fetch current profile (used to seed history_id on first sync).
export async function fetchGmailProfile(
  account: GmailAccount,
): Promise<{ emailAddress: string; historyId: string }> {
  const accessToken = await getActiveAccessToken(account);
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Gmail profile fetch failed: ${res.status}`);
  }
  return (await res.json()) as { emailAddress: string; historyId: string };
}

// Fetch a single message in full format.
export async function fetchGmailMessage(
  account: GmailAccount,
  messageId: string,
): Promise<GmailMessageDetail> {
  const accessToken = await getActiveAccessToken(account);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Gmail message fetch failed: ${res.status}`);
  }
  return (await res.json()) as GmailMessageDetail;
}

// List message IDs added since startHistoryId. Returns up to ~500 messages
// before paging stops.
export async function listGmailHistory(
  account: GmailAccount,
  startHistoryId: string,
): Promise<{
  newMessageIds: string[];
  latestHistoryId: string | null;
  expired: boolean;
}> {
  const accessToken = await getActiveAccessToken(account);
  const newIds = new Set<string>();
  let pageToken: string | undefined;
  let latest: string | null = null;

  do {
    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/history",
    );
    url.searchParams.set("startHistoryId", startHistoryId);
    url.searchParams.set("historyTypes", "messageAdded");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404) {
      // history_id older than ~7 days — Gmail purged it. Caller should
      // reseed via fetchGmailProfile().
      return { newMessageIds: [], latestHistoryId: null, expired: true };
    }
    if (!res.ok) {
      throw new Error(`Gmail history list failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      history?: Array<{
        id: string;
        messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
      }>;
      nextPageToken?: string;
      historyId: string;
    };
    if (data.history) {
      for (const h of data.history) {
        if (h.messagesAdded) {
          for (const m of h.messagesAdded) {
            newIds.add(m.message.id);
          }
        }
      }
    }
    latest = data.historyId ?? latest;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return {
    newMessageIds: Array.from(newIds),
    latestHistoryId: latest,
    expired: false,
  };
}

// =============================================================================
// Message parsing helpers
// =============================================================================

export function header(
  headers: GmailMessageHeader[],
  name: string,
): string | null {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

// "Jane Doe <jane@example.com>" → { name: "Jane Doe", email: "jane@example.com" }
export function parseAddress(value: string | null): {
  name: string | null;
  email: string | null;
} {
  if (!value) return { name: null, email: null };
  const m = /<([^>]+)>/.exec(value);
  if (m) {
    const email = m[1].trim();
    const name = value.slice(0, m.index).trim().replace(/^"|"$/g, "");
    return { name: name || null, email };
  }
  return { name: null, email: value.trim() };
}

export function parseAddressList(value: string | null): string[] {
  if (!value) return [];
  // Split on commas but try not to split inside <...>. Simple regex is fine
  // for typical Gmail outputs.
  return value
    .split(/,(?![^<]*>)/)
    .map((part) => parseAddress(part).email)
    .filter((x): x is string => !!x);
}

// Pull out plain text + html bodies. Walks the multipart tree.
export function extractBodies(message: GmailMessageDetail): {
  text: string | null;
  html: string | null;
} {
  let text: string | null = null;
  let html: string | null = null;

  function visit(part: GmailMessageDetail["payload"] | NonNullable<GmailMessageDetail["payload"]["parts"]>[number]) {
    if (!part) return;
    const mime = (part as { mimeType?: string }).mimeType ?? "";
    const body = (part as { body?: { data?: string } }).body;
    if (body?.data) {
      const decoded = decodeBase64Url(body.data);
      if (mime === "text/plain" && !text) text = decoded;
      else if (mime === "text/html" && !html) html = decoded;
    }
    const parts = (part as { parts?: typeof part[] }).parts;
    if (parts) {
      for (const p of parts) visit(p);
    }
  }

  visit(message.payload);
  return { text, html };
}

function decodeBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}
