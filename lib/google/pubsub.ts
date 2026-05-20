import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { appUrl } from "@/lib/stripe/client";

// Pub/Sub push delivery uses Google-signed OIDC tokens in the
// Authorization: Bearer <jwt> header. We verify them against Google's
// public JWKS so only legitimate push notifications can trigger the
// webhook.

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export function pubsubConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PUBSUB_TOPIC);
}

export function pubsubTopic(): string {
  const v = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!v) throw new Error("GOOGLE_PUBSUB_TOPIC is not set");
  return v;
}

// Audience the subscription was created with. Defaults to the public push
// endpoint URL — that's what Google sets when you enable OIDC and leave
// the audience field blank.
function pubsubAudience(): string {
  return (
    process.env.GOOGLE_PUBSUB_AUDIENCE ??
    `${appUrl().replace(/\/$/, "")}/api/integrations/gmail/pubsub`
  );
}

// Verify the OIDC bearer token from the Pub/Sub push request.
export async function verifyPubsubJWT(token: string): Promise<{
  email: string | null;
  sub: string;
}> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: pubsubAudience(),
  });
  return {
    email: typeof payload.email === "string" ? payload.email : null,
    sub: typeof payload.sub === "string" ? payload.sub : "",
  };
}

export interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

// Pub/Sub push delivers a wrapper:
//   { message: { data: base64(<gmail-payload-json>), messageId, ... },
//     subscription: "projects/.../subscriptions/..." }
// Returns the decoded Gmail notification, or null if the payload is empty
// (which Google does for heartbeat pings).
export function parsePubsubPushBody(
  body: unknown,
): GmailNotification | null {
  if (
    !body ||
    typeof body !== "object" ||
    !("message" in body) ||
    !body.message ||
    typeof body.message !== "object"
  ) {
    return null;
  }
  const message = (body as { message: { data?: string } }).message;
  if (!message.data) return null;
  const raw = Buffer.from(message.data, "base64").toString("utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<GmailNotification>;
    if (!parsed.emailAddress || !parsed.historyId) return null;
    return {
      emailAddress: parsed.emailAddress,
      historyId: String(parsed.historyId),
    };
  } catch {
    return null;
  }
}
