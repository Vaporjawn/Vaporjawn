import { calculateStreaks } from "./calculateStreaks.mjs";
import { contentHash } from "./contentHash.mjs";
import { fetchContributionDays } from "./fetchContributionDays.mjs";
import { fetchProfileStats } from "./fetchProfileStats.mjs";
import { renderGithubCards } from "./renderGithubCards.mjs";
import { renderStatsCardSvg } from "./renderStatsCardSvg.mjs";
import { renderStreakCardSvg } from "./renderStreakCardSvg.mjs";

/**
 * Fetches the data for the two GitHub cards and builds their SVG files plus
 * the README markup that shows them.
 *
 * @param {{ githubUser: string, displayName: string, githubToken: string, statsHref: string, streakHref: string, now?: Date }} options - Account, token, image paths, and an injectable clock.
 * @param {{ fetchImplementation?: typeof fetch }} [dependencies] - Injectable fetch, for tests.
 * @returns {Promise<{ markdown: string, statsSvg: string, streakSvg: string }>} The README markup and both SVG documents.
 */
export const buildGithubCards = async (options, dependencies = {}) => {
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);

  const [days, profile] = await Promise.all([
    fetchContributionDays(options.githubUser, options.githubToken, fetchImplementation, now),
    fetchProfileStats(options.githubUser, options.githubToken, fetchImplementation),
  ]);
  const streaks = calculateStreaks(days, today);

  const statsSvg = renderStatsCardSvg({
    name: options.displayName,
    stars: profile.stars,
    lastYearContributions: streaks.lastYear.total,
    pullRequests: profile.pullRequests,
    issues: profile.issues,
    publicRepos: profile.publicRepos,
    activeDayPercent: (streaks.lastYear.activeDays / streaks.lastYear.dayCount) * 100,
  });
  const streakSvg = renderStreakCardSvg(streaks, today);

  const format = (number) => number.toLocaleString("en-US");
  const markdown = renderGithubCards({
    statsHref: `${options.statsHref}?v=${contentHash(statsSvg)}`,
    streakHref: `${options.streakHref}?v=${contentHash(streakSvg)}`,
    statsAlt: `${options.displayName}'s GitHub stats: ${format(profile.stars)} stars, ${format(streaks.lastYear.total)} contributions in the last year, ${format(profile.pullRequests)} pull requests, ${format(profile.issues)} issues, ${format(profile.publicRepos)} public repositories`,
    streakAlt: `GitHub contribution streak: ${format(streaks.total)} total contributions, ${streaks.current.length} day current streak, ${streaks.longest.length} day longest streak`,
  });
  return { markdown, statsSvg, streakSvg };
};
