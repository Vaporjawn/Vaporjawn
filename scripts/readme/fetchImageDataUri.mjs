/**
 * Downloads a JPEG and returns it as a base64 data URI so it can be embedded
 * in an SVG (an SVG shown through `<img>` cannot load outside files).
 * Anything that is not an `https` JPEG under the size limit, or any failure,
 * yields null so one missing picture never breaks a whole image.
 *
 * @param {string} url - The image address (must start with `https://`).
 * @param {number} maxBytes - Largest accepted image size.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<string | null>} A `data:image/jpeg;base64,...` URI, or null.
 */
export const fetchImageDataUri = async (url, maxBytes, fetchImplementation = fetch) => {
  try {
    if (!String(url).startsWith("https://")) {
      return null;
    }
    const response = await fetchImplementation(url, { signal: AbortSignal.timeout(20_000) });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/jpeg")) {
      return null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > maxBytes) {
      return null;
    }
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
};
