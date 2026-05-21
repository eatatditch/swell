import "server-only";

import twilio from "twilio";

export interface TwilioSendResult {
  ok: boolean;
  messageId: string | null;
  error: string | null;
}

export interface TwilioSendArgs {
  to: string;
  body: string;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }
  return twilio(sid, token);
}

export function getTwilioSender(): {
  from?: string;
  messagingServiceSid?: string;
} {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (messagingServiceSid) return { messagingServiceSid };
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new Error(
      "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER in env",
    );
  }
  return { from };
}

export async function sendSmsViaTwilio(
  args: TwilioSendArgs,
): Promise<TwilioSendResult> {
  const client = getClient();
  const sender = getTwilioSender();
  try {
    const msg = await client.messages.create({
      to: args.to,
      body: args.body,
      ...sender,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
    });
    return { ok: true, messageId: msg.sid, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twilio send failed";
    return { ok: false, messageId: null, error: message };
  }
}

/** Normalize a phone number to E.164. Accepts (555) 555-5555 etc. */
export function toE164(input: string, defaultCountry = "1"): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (input.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith(defaultCountry))
    return `+${digits}`;
  return null;
}
