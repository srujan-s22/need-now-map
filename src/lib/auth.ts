import crypto from "crypto";
import { cookies } from "next/headers";

export const AUTHORITY_COOKIE_NAME = "authority_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.PASSCODE || "neednow-default-session-secret";
}

function getExpectedPasscode(): string {
  return process.env.PASSCODE || "demo123";
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function verifyPasscode(inputPasscode: string): boolean {
  const expected = getExpectedPasscode();
  if (typeof inputPasscode !== "string" || inputPasscode.length === 0) {
    return false;
  }

  const inputBuffer = Buffer.from(inputPasscode);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

/**
 * Generate a signed session token.
 * Format: `<timestamp>.<signature>`
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSecretKey();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`authority:${timestamp}`)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

/**
 * Validate the signed session token and ensure it hasn't expired.
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [timestampStr, receivedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  // Check expiration (7 days)
  const ageSeconds = (Date.now() - timestamp) / 1000;
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) {
    return false;
  }

  const secret = getSecretKey();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`authority:${timestampStr}`)
    .digest("hex");

  const receivedSigBuffer = Buffer.from(receivedSig);
  const expectedSigBuffer = Buffer.from(expectedSig);

  if (receivedSigBuffer.length !== expectedSigBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedSigBuffer, expectedSigBuffer);
}

/**
 * Server-side helper to check if the current request has a valid authority session.
 */
export async function isAuthorized(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTHORITY_COOKIE_NAME);
    return verifySessionToken(sessionCookie?.value);
  } catch (error) {
    console.error("isAuthorized check error:", error);
    return false;
  }
}
