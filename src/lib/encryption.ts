import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
  return Buffer.from(key, "base64");
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv (12) + encrypted (variable) + tag (16)
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a base64-encoded string produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Minimum base64 length for a valid encrypted value:
 * IV (12 bytes) + at least 1 byte ciphertext + tag (16 bytes) = 29 bytes → 40 base64 chars.
 */
const MIN_ENCRYPTED_LENGTH = 40;

/**
 * Decrypt a value, returning null if the value is empty.
 * Logs a warning and returns null for legacy plaintext values instead of
 * silently accepting them — callers should treat null as "no key configured."
 */
export function safeDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    // Detect likely plaintext: too short for valid ciphertext or not base64-shaped
    console.warn(
      "[encryption] Failed to decrypt value — possible legacy plaintext. " +
      "Re-save the value in Project Settings to encrypt it."
    );
    return null;
  }
}
