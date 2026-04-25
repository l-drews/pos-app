import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

/**
 * Hash a password using scrypt. Returns `salt:hash` (hex-encoded).
 * Compatible with the format used in server/db/seed.ts.
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a `salt:hash` string.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(plain, salt, SCRYPT_KEY_LENGTH);
  return crypto.timingSafeEqual(derived, Buffer.from(hash, "hex"));
}
