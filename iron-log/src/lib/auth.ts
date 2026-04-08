/**
 * Simple HMAC-signed auth cookie for single-user mode.
 *
 * Flow:
 *  - User submits password on /login
 *  - Server compares to APP_PASSWORD env var
 *  - On match, sets a signed cookie `flog_auth` = `${timestamp}.${signature}`
 *  - Middleware validates the cookie on every non-public request
 *
 * Runs in edge runtime (middleware) so we use Web Crypto, not node:crypto.
 */

export const COOKIE_NAME = "flog_auth";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bufferToBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signAuthCookie(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await hmac(timestamp, secret);
  return `${timestamp}.${signature}`;
}

export async function verifyAuthCookie(
  value: string | undefined,
  secret: string
): Promise<boolean> {
  if (!value) return false;
  const [timestamp, signature] = value.split(".");
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > MAX_AGE_SECONDS * 1000) return false;

  const expected = await hmac(timestamp, secret);
  return timingSafeEqual(signature, expected);
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET env var is missing or too short (minimum 16 chars)."
    );
  }
  return secret;
}

export function getAppPassword(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new Error("APP_PASSWORD env var is missing.");
  }
  return password;
}
