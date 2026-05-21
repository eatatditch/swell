import "server-only";

import { Resend } from "resend";

/**
 * Per-send result. We surface the provider message id so a caller can map
 * webhook callbacks back to the originating marketing_sends row.
 */
export interface ResendSendResult {
  ok: boolean;
  messageId: string | null;
  error: string | null;
}

export interface ResendSendArgs {
  to: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  /** Includes a List-Unsubscribe header pointing here. */
  unsubscribeUrl?: string;
  /** Tags for Resend dashboard filtering. */
  tags?: { name: string; value: string }[];
}

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export function getDefaultSender(): { name: string; email: string } {
  const email = process.env.RESEND_FROM_EMAIL ?? "hi@mail.eatatditch.com";
  const name = process.env.RESEND_FROM_NAME ?? "Ditch";
  return { name, email };
}

export async function sendEmailViaResend(
  args: ResendSendArgs,
): Promise<ResendSendResult> {
  const client = getClient();
  const sender = getDefaultSender();
  const from = `${args.fromName ?? sender.name} <${args.fromEmail ?? sender.email}>`;

  const headers: Record<string, string> = {};
  if (args.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${args.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const res = await client.emails.send({
      from,
      to: args.to,
      replyTo: args.replyTo,
      subject: args.subject,
      html: args.html,
      text: args.text,
      headers,
      tags: args.tags,
    });
    if (res.error) {
      return { ok: false, messageId: null, error: res.error.message };
    }
    return {
      ok: true,
      messageId: res.data?.id ?? null,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      messageId: null,
      error: err instanceof Error ? err.message : "Resend send failed",
    };
  }
}
