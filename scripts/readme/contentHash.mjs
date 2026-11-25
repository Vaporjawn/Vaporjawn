import { createHash } from "node:crypto";

/**
 * Short, stable fingerprint of some text, used to version image URLs so a
 * changed image is never served from a stale browser or proxy cache.
 *
 * @param {string} text - The content to fingerprint.
 * @returns {string} The first 8 hex characters of its SHA-1.
 */
export const contentHash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 8);
