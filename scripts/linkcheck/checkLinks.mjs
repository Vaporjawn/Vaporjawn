import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkUrl } from "./checkUrl.mjs";
import { extractLinks } from "./extractLinks.mjs";
import { loadSinglePageUrls } from "./loadSinglePageUrls.mjs";
import { runPool } from "./runPool.mjs";

/**
 * Checks every link and image in a README: local paths must exist in the
 * repository, web addresses must answer (see `checkUrl`).
 *
 * @param {{ markdown: string, repoRoot: string, singlePageOrigins?: string[] }} options - The README text, the repository folder, and single-page-app sites to learn known pages from.
 * @param {{ fetchImplementation?: typeof fetch, sleep?: (ms: number) => Promise<void> }} [dependencies] - Injectable fetch and sleep, for tests.
 * @returns {Promise<{ url: string, kind: string, verdict: "ok" | "blocked" | "broken", detail: string }[]>} One result per address.
 */
export const checkLinks = async (options, dependencies = {}) => {
  const items = extractLinks(options.markdown);
  const knownSinglePageUrls = new Set();
  for (const origin of options.singlePageOrigins ?? []) {
    for (const url of await loadSinglePageUrls(origin, dependencies.fetchImplementation)) {
      knownSinglePageUrls.add(url);
    }
  }
  return runPool(items, 6, async (item) => {
    if (item.isLocal) {
      const path = item.url.replace(/[?#].*$/, "").replace(/^\.\//, "");
      return existsSync(join(options.repoRoot, path))
        ? { url: item.url, kind: item.kind, verdict: "ok", detail: "file exists" }
        : { url: item.url, kind: item.kind, verdict: "broken", detail: "file not found in the repository" };
    }
    return checkUrl(item, { ...dependencies, knownSinglePageUrls });
  });
};
