/**
 * Collects the addresses a single-page-app site is known to serve, from its
 * sitemap and RSS feed (a feed lists blog posts a stale sitemap may miss).
 * Failures just return fewer addresses.
 *
 * @param {string} origin - The site origin, e.g. `https://vaporjawn.dev`.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<Set<string>>} Addresses without trailing slash, query or hash.
 */
export const loadSinglePageUrls = async (origin, fetchImplementation = fetch) => {
  const known = new Set([origin]);
  for (const path of ["/sitemap.xml", "/rss.xml"]) {
    try {
      const response = await fetchImplementation(`${origin}${path}`, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) {
        continue;
      }
      const xml = await response.text();
      for (const match of xml.matchAll(/<(?:loc|link)>\s*(?:<!\[CDATA\[)?(https?:\/\/[^<\]\s]+)/g)) {
        known.add(match[1].replace(/[?#].*$/, "").replace(/\/$/, ""));
      }
    } catch {
      // A missing sitemap or feed only means fewer known pages.
    }
  }
  return known;
};
