import { fetchJson } from "./fetchJson.mjs";

/**
 * Downloads WakaTime's list of program languages and their brand colours.
 * Failure is not fatal for the chart (it falls back to generated colours), so
 * an unreachable service yields an empty map.
 *
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<Map<string, string>>} Lower-cased language name to `#rrggbb` colour.
 */
export const fetchLanguageColors = async (fetchImplementation = fetch) => {
  try {
    const body = await fetchJson("https://wakatime.com/api/v1/program_languages", {}, fetchImplementation);
    return new Map(
      (body?.data ?? [])
        .filter((language) => /^#[0-9a-fA-F]{6}$/.test(language.color ?? ""))
        .map((language) => [String(language.name).toLowerCase(), language.color]),
    );
  } catch {
    return new Map();
  }
};
