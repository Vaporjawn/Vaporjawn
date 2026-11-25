import { parseRssItems } from "./parseRssItems.mjs";

/**
 * Downloads the blog's RSS feed and returns its newest posts.
 *
 * @param {string} feedUrl - The RSS feed URL.
 * @param {number} limit - How many posts to return.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ title: string, link: string, publishedAt: Date | null }[]>} Posts in feed order.
 * @throws {Error} When the feed cannot be downloaded or has no posts.
 */
export const fetchBlogPosts = async (feedUrl, limit, fetchImplementation = fetch) => {
  const response = await fetchImplementation(feedUrl, {
    headers: { "User-Agent": "Vaporjawn-readme-updater" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Blog feed request failed with HTTP ${response.status}.`);
  }
  const posts = parseRssItems(await response.text(), limit);
  if (posts.length === 0) {
    throw new Error("Blog feed contained no posts.");
  }
  return posts;
};
