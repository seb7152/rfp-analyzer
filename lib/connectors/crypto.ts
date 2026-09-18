/**
 * Secrets of the connectors (a Granola API key) are stored encrypted with a
 * server-side key, AES-256-GCM. The browser never receives them: the API
 * returns the last four characters at most.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = "v1";

function keyBytes(): Buffer {
  const raw = process.env.CONNECTORS_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("CONNECTORS_ENCRYPTION_KEY n'est pas définie : les clés de connecteurs ne peuvent pas être stockées.");
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("CONNECTORS_ENCRYPTION_KEY doit faire 32 octets (64 caractères hexadécimaux).");
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [version, iv, tag, data] = ciphertext.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Secret illisible.");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** What the browser may see of a key. */
export function last4(secret: string): string {
  return secret.slice(-4);
}
