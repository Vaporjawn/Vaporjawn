import { classifyResponse } from "./classifyResponse.mjs";

const USER_AGENT = "Mozilla/5.0 (compatible; Vaporjawn-readme-link-check)";
const RETRY_DELAYS_MS = [2_000, 6_000];

/**
 * Checks one address, retrying on network errors and server errors, which are
 * often momentary. A final 404 on a single-page-app host is accepted when the
 * page is listed in that site's own sitemap or feed (such hosts answer 404 for
 * every route but still serve the app).
 *
 * @param {{ url: string, kind: "image" | "link" }} item - The address and its use.
 * @param {{ fetchImplementation?: typeof fetch, sleep?: (ms: number) => Promise<void>, knownSinglePageUrls?: Set<string> }} [dependencies] - Injectable fetch and sleep, and the set of addresses a single-page-app host is known to serve.
 * @returns {Promise<{ url: string, kind: string, verdict: "ok" | "blocked" | "broken", detail: string }>} The result.
 */
export const checkUrl = async (item, dependencies = {}) => {
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last = { verdict: "broken", detail: "not checked" };

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchImplementation(item.url, {
        headers: { "User-Agent": USER_AGENT, Accept: item.kind === "image" ? "image/*,*/*;q=0.5" : "text/html,*/*;q=0.5" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      await response.body?.cancel().catch(() => {});
      last = classifyResponse(response.status, response.headers.get("content-type") ?? "", item.kind);
      if (response.status === 404 && dependencies.knownSinglePageUrls?.has(item.url.replace(/[?#].*$/, "").replace(/\/$/, ""))) {
        last = { verdict: "ok", detail: "HTTP 404 from a single-page app, but the page is listed in the site's sitemap or feed" };
      }
      if (last.verdict !== "broken" || response.status < 500) {
        break;
      }
    } catch (error) {
      last = { verdict: "broken", detail: `request failed: ${error.cause?.code ?? error.name}` };
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return { url: item.url, kind: item.kind, ...last };
};
