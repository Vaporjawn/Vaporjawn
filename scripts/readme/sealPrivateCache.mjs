import { createCipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts the private-repository cache (AES-256-GCM) with a key derived from
 * the token, so the file is useless to anyone who can read the Actions cache
 * but does not hold the secret.
 *
 * @param {object} cache - The cache object to protect.
 * @param {string} token - The secret the key is derived from.
 * @returns {string} Base64 text: a random 12-byte nonce, the 16-byte auth tag, then the ciphertext.
 */
export const sealPrivateCache = (cache, token) => {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(`lines-private-cache:${token}`).digest(), nonce);
  const body = Buffer.concat([cipher.update(JSON.stringify(cache), "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), body]).toString("base64");
};
