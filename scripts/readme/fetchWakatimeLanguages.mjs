import { fetchJson } from "./fetchJson.mjs";

/**
 * Reads a user's public all-time WakaTime language stats and removes the
 * "Other" bucket (time WakaTime could not attribute to a language), then
 * rescales the remaining languages so their percentages add up to 100.
 *
 * @param {string} user - The WakaTime username.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ languages: { name: string, percent: number, seconds: number }[], rangeText: string }>} Languages, largest first, and WakaTime's wording for the date range.
 * @throws {Error} When the response has no languages besides "Other".
 */
export const fetchWakatimeLanguages = async (user, fetchImplementation = fetch) => {
  const body = await fetchJson(
    `https://wakatime.com/api/v1/users/${encodeURIComponent(user)}/stats/all_time`,
    {},
    fetchImplementation,
  );
  const rawLanguages = body?.data?.languages;
  if (!Array.isArray(rawLanguages)) {
    throw new Error("WakaTime returned no language stats.");
  }
  const known = rawLanguages
    .filter((language) => String(language.name).toLowerCase() !== "other" && Number(language.percent) > 0)
    .map((language) => ({
      name: String(language.name),
      percent: Number(language.percent),
      seconds: (Number(language.ai_coding_seconds) || 0) + (Number(language.manual_coding_seconds) || 0),
    }));
  const total = known.reduce((sum, language) => sum + language.percent, 0);
  if (known.length === 0 || total <= 0) {
    throw new Error("WakaTime returned no languages besides Other.");
  }
  return {
    languages: known
      .map((language) => ({ ...language, percent: (language.percent / total) * 100 }))
      .sort((a, b) => b.percent - a.percent),
    rangeText: String(body.data.human_readable_range ?? "all time"),
  };
};
