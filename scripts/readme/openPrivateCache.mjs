import { createDecipheriv, createHash } from "node:crypto";

/**
 * Decrypts text made by `sealPrivateCache`. Anything unreadable (wrong token,
 * tampered or old plain-text file) yields an empty cache, so the worst case is
 * a recount rather than a failure.
 *
 * @param {string} sealed - The base64 text from `sealPrivateCache`.
 * @param {string | undefined} token - The secret the key is derived from.
 * @returns {Record<string, { pushedAt: string, counts: Record<string, number> }>} The cache, or `{}`.
 */
export const openPrivateCache = (sealed, token) => {
  try {
    const bytes = Buffer.from(sealed, "base64");
    const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(`lines-private-cache:${token}`).digest(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
  } catch {
    return {};
  }
};
