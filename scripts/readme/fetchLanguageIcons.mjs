import { fetchJson } from "./fetchJson.mjs";

const ICON_PACKAGE = "https://cdn.jsdelivr.net/npm/simple-icons@16";
const SAFE_PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-., \n]+$/;
const NAME_OVERRIDES = new Map([
  ["html", "html5"],
  ["bash", "gnubash"],
  ["git config", "git"],
  ["vue.js", "vuedotjs"],
  ["node.js", "nodedotjs"],
]);

/**
 * Looks up logos for languages in the Simple Icons set (published on npm,
 * served by jsDelivr). Each logo is a single 24x24 path plus a brand colour,
 * which the chart draws inline because an SVG shown through `<img>` cannot
 * load outside files. Languages with no logo are simply absent from the
 * result, and any network failure yields an empty or partial map rather than
 * an error.
 *
 * @param {string[]} languageNames - Language names as WakaTime reports them.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<Map<string, { path: string, hex: string }>>} Lower-cased language name to logo path and `rrggbb` colour.
 */
export const fetchLanguageIcons = async (languageNames, fetchImplementation = fetch) => {
  const icons = new Map();
  let catalog;
  try {
    catalog = await fetchJson(`${ICON_PACKAGE}/data/simple-icons.json`, {}, fetchImplementation);
  } catch {
    return icons;
  }
  const bySlug = new Map();
  const byName = new Map();
  for (const entry of catalog) {
    bySlug.set(entry.slug, entry);
    byName.set(String(entry.title).toLowerCase(), entry);
    for (const alias of entry.aliases?.aka ?? []) {
      byName.set(String(alias).toLowerCase(), byName.get(String(alias).toLowerCase()) ?? entry);
    }
  }

  await Promise.all(
    languageNames.map(async (name) => {
      const key = name.toLowerCase();
      const entry = bySlug.get(NAME_OVERRIDES.get(key) ?? "") ?? byName.get(key);
      if (!entry || !/^[0-9A-Fa-f]{6}$/.test(entry.hex) || !/^[a-z0-9]+$/.test(entry.slug)) {
        return;
      }
      try {
        const response = await fetchImplementation(`${ICON_PACKAGE}/icons/${entry.slug}.svg`, {
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          return;
        }
        const path = (await response.text()).match(/<path d="([^"]+)"/)?.[1];
        if (path && SAFE_PATH.test(path)) {
          icons.set(key, { path, hex: entry.hex });
        }
      } catch {
        // A missing logo just falls back to a letter badge.
      }
    }),
  );
  return icons;
};
