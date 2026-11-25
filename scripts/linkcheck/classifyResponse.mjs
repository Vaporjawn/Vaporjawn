const BOT_BLOCK_STATUSES = new Set([401, 403, 405, 406, 429, 999]);

/**
 * Decides whether an HTTP answer means a link is healthy, merely unverifiable
 * (many sites refuse automated requests), or broken. An image must also come
 * back with an image content type, which catches hosts that answer 200 with an
 * error page.
 *
 * @param {number} status - The final HTTP status.
 * @param {string} contentType - The response content type (may be empty).
 * @param {"image" | "link"} kind - What the address is used for.
 * @returns {{ verdict: "ok" | "blocked" | "broken", detail: string }} The verdict and a short reason.
 */
export const classifyResponse = (status, contentType, kind) => {
  if (status >= 200 && status < 300) {
    if (kind === "image" && !/^image\//i.test(contentType)) {
      return { verdict: "broken", detail: `HTTP ${status} but the content type is "${contentType || "none"}", not an image` };
    }
    return { verdict: "ok", detail: `HTTP ${status}` };
  }
  if (BOT_BLOCK_STATUSES.has(status)) {
    return { verdict: "blocked", detail: `HTTP ${status} (site refuses automated checks)` };
  }
  return { verdict: "broken", detail: `HTTP ${status}` };
};
