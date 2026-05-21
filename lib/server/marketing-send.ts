import "server-only";

import { createHmac, randomBytes } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import {
  getDefaultSender,
  sendEmailViaResend,
} from "@/lib/server/email-resend";
import { sendSmsViaTwilio, toE164 } from "@/lib/server/sms-twilio";
import type {
  ContentItem,
  MarketingSubscriber,
  SendChannel,
} from "@/lib/types/database";

export interface AudienceMatch {
  total: number;
  subscribers: MarketingSubscriber[];
}

/**
 * Resolve the recipient list for a given content item. An empty
 * `target_tags` array means "everyone with the right channel consent".
 * Tag matching is OR (any tag match counts).
 */
export async function resolveAudience(
  item: Pick<ContentItem, "channel" | "target_tags">,
): Promise<AudienceMatch> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("marketing_subscribers")
    .select("*")
    .eq("is_active", true);

  if (item.channel === "email") {
    query = query.eq("opt_in_email", true).is("opt_out_email_at", null).not(
      "email",
      "is",
      null,
    );
  } else if (item.channel === "sms") {
    query = query.eq("opt_in_sms", true).is("opt_out_sms_at", null).not(
      "phone",
      "is",
      null,
    );
  } else {
    return { total: 0, subscribers: [] };
  }

  if (item.target_tags && item.target_tags.length > 0) {
    query = query.overlaps("tags", item.target_tags);
  }

  const { data } = await query.order("created_at", { ascending: true });
  const subs = (data ?? []) as MarketingSubscriber[];
  return { total: subs.length, subscribers: subs };
}

export interface SendItemResult {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Send a content_item to its resolved audience. Logs one
 * marketing_sends row per recipient with the provider's message id.
 * Updates content_item.status to 'posted' on first successful send.
 */
export async function sendContentItem(itemId: string): Promise<SendItemResult> {
  const admin = createSupabaseAdminClient();
  const { data: itemRow } = await admin
    .from("content_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (!itemRow) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: ["Content item not found"],
    };
  }
  const item = itemRow as ContentItem;
  if (item.channel !== "email" && item.channel !== "sms") {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: [`Channel ${item.channel} is not sendable yet`],
    };
  }

  const { subscribers } = await resolveAudience(item);
  if (subscribers.length === 0) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: ["Audience is empty — nothing to send"],
    };
  }

  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const sub of subscribers) {
    if (item.channel === "email") {
      const to = sub.email;
      if (!to) {
        failed += 1;
        continue;
      }
      const unsubToken = generateUnsubToken(sub.id);
      const unsubscribeUrl = unsubscribeLink(sub.id, "email", unsubToken);
      const html = renderEmailHtml({
        body: item.body ?? item.caption ?? "",
        preheader: item.preheader,
        unsubscribeUrl,
      });
      const text = stripHtml(item.body ?? item.caption ?? "");

      const send = await admin
        .from("marketing_sends")
        .insert({
          content_item_id: item.id,
          subscriber_id: sub.id,
          channel: "email" as SendChannel,
          provider: "resend",
          to_email: to,
          status: "sending",
          sent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const sendRowId = (send.data as { id: string } | null)?.id ?? null;

      const result = await sendEmailViaResend({
        to,
        subject: item.subject ?? item.title,
        html,
        text,
        unsubscribeUrl,
        tags: [
          { name: "content_item", value: item.id },
          { name: "channel", value: "email" },
        ],
      });

      if (result.ok) {
        succeeded += 1;
        if (sendRowId) {
          await admin
            .from("marketing_sends")
            .update({
              status: "sent",
              provider_message_id: result.messageId,
            })
            .eq("id", sendRowId);
        }
        await admin
          .from("marketing_subscribers")
          .update({ last_emailed_at: new Date().toISOString() })
          .eq("id", sub.id);
      } else {
        failed += 1;
        errors.push(result.error ?? "Unknown send error");
        if (sendRowId) {
          await admin
            .from("marketing_sends")
            .update({
              status: "failed",
              error_message: result.error,
            })
            .eq("id", sendRowId);
        }
      }
    } else {
      const e164 = sub.phone ? toE164(sub.phone) : null;
      if (!e164) {
        failed += 1;
        continue;
      }
      const body = appendStopFooter(item.body ?? item.caption ?? "");
      const send = await admin
        .from("marketing_sends")
        .insert({
          content_item_id: item.id,
          subscriber_id: sub.id,
          channel: "sms" as SendChannel,
          provider: "twilio",
          to_phone: e164,
          status: "sending",
          sent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const sendRowId = (send.data as { id: string } | null)?.id ?? null;

      const result = await sendSmsViaTwilio({ to: e164, body });

      if (result.ok) {
        succeeded += 1;
        if (sendRowId) {
          await admin
            .from("marketing_sends")
            .update({
              status: "sent",
              provider_message_id: result.messageId,
            })
            .eq("id", sendRowId);
        }
        await admin
          .from("marketing_subscribers")
          .update({ last_smsed_at: new Date().toISOString() })
          .eq("id", sub.id);
      } else {
        failed += 1;
        errors.push(result.error ?? "Unknown send error");
        if (sendRowId) {
          await admin
            .from("marketing_sends")
            .update({
              status: "failed",
              error_message: result.error,
            })
            .eq("id", sendRowId);
        }
      }
    }
  }

  if (succeeded > 0) {
    await admin
      .from("content_items")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }

  return {
    attempted: subscribers.length,
    succeeded,
    failed,
    errors: errors.slice(0, 5),
  };
}

/**
 * Test-send to a single arbitrary address — useful for previewing without
 * touching the subscriber list.
 */
export async function testSendContentItem(
  itemId: string,
  recipient: string,
): Promise<SendItemResult> {
  const admin = createSupabaseAdminClient();
  const { data: itemRow } = await admin
    .from("content_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (!itemRow) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: ["Content item not found"],
    };
  }
  const item = itemRow as ContentItem;

  if (item.channel === "email") {
    const html = renderEmailHtml({
      body: item.body ?? item.caption ?? "",
      preheader: item.preheader,
      isTest: true,
    });
    const result = await sendEmailViaResend({
      to: recipient,
      subject: `[TEST] ${item.subject ?? item.title}`,
      html,
      text: stripHtml(item.body ?? item.caption ?? ""),
      tags: [{ name: "test", value: "1" }],
    });
    return {
      attempted: 1,
      succeeded: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      errors: result.error ? [result.error] : [],
    };
  }
  if (item.channel === "sms") {
    const e164 = toE164(recipient);
    if (!e164) {
      return {
        attempted: 1,
        succeeded: 0,
        failed: 1,
        errors: ["Bad phone format"],
      };
    }
    const result = await sendSmsViaTwilio({
      to: e164,
      body: appendStopFooter(`[TEST] ${item.body ?? item.caption ?? ""}`),
    });
    return {
      attempted: 1,
      succeeded: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      errors: result.error ? [result.error] : [],
    };
  }
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    errors: [`Channel ${item.channel} is not sendable`],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEmailHtml(args: {
  body: string;
  preheader?: string | null;
  unsubscribeUrl?: string;
  isTest?: boolean;
}): string {
  const sender = getDefaultSender();
  const safeBody = args.body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const preheader = args.preheader
    ? `<div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(args.preheader)}</div>`
    : "";
  const testBanner = args.isTest
    ? `<div style="background:#fff3cd;border:1px solid #f0c674;color:#856404;padding:8px 12px;font-family:system-ui,sans-serif;font-size:12px;margin-bottom:16px;">This is a test send.</div>`
    : "";
  const unsub = args.unsubscribeUrl
    ? `<p style="color:#888;font-size:12px;margin-top:24px;">
         You're getting this because you signed up at Ditch.
         <a href="${args.unsubscribeUrl}" style="color:#888;">Unsubscribe</a>.
       </p>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1c;">
${preheader}
<div style="max-width:560px;margin:0 auto;padding:24px;">
  ${testBanner}
  <div style="background:#fff;border-radius:12px;padding:24px;">
    ${safeBody}
  </div>
  <p style="color:#888;font-size:12px;margin-top:16px;text-align:center;">
    ${escapeHtml(sender.name)} · eatatditch.com
  </p>
  ${unsub}
</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function appendStopFooter(body: string): string {
  if (/STOP/i.test(body)) return body;
  return `${body.trim()} Reply STOP to opt out.`;
}

export function generateUnsubToken(subscriberId: string): string {
  const secret = unsubSecret();
  return createHmac("sha256", secret).update(subscriberId).digest("base64url");
}

function unsubSecret(): string {
  return (
    process.env.UNSUB_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    randomBytes(32).toString("hex")
  );
}

function unsubscribeLink(
  subscriberId: string,
  channel: SendChannel,
  token: string,
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://swell.swellbrands.co";
  return `${base}/api/marketing/unsubscribe?sid=${encodeURIComponent(
    subscriberId,
  )}&ch=${channel}&t=${encodeURIComponent(token)}`;
}

export function verifyUnsubToken(
  subscriberId: string,
  token: string,
): boolean {
  return generateUnsubToken(subscriberId) === token;
}
