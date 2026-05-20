import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM token encryption for Gmail access/refresh tokens.
//
// Key sourcing: GMAIL_TOKEN_ENCRYPTION_KEY env var, hex-encoded 32 bytes
// (64 hex chars). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// On-disk format: base64(iv || ciphertext || authTag). The 12-byte IV at the
// front is unique per encryption; the 16-byte tag at the end is the GCM auth
// tag that detects tampering.

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  const hex = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not set");
  }
  if (hex.length !== 64) {
    throw new Error(
      "GMAIL_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decryptToken(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Encrypted token blob is too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function tokenEncryptionConfigured(): boolean {
  const hex = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  return typeof hex === "string" && hex.length === 64;
}
