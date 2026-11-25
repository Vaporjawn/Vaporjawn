import { readFile, writeFile } from "node:fs/promises";
import { buildGithubCards } from "./buildGithubCards.mjs";
import { buildSteamGames } from "./buildSteamGames.mjs";
import { contentHash } from "./contentHash.mjs";
import { fetchArtistImage } from "./fetchArtistImage.mjs";
import { fetchBlogPosts } from "./fetchBlogPosts.mjs";
import { fetchLanguageColors } from "./fetchLanguageColors.mjs";
import { fetchLanguageIcons } from "./fetchLanguageIcons.mjs";
import { fetchRecentRepos } from "./fetchRecentRepos.mjs";
import { fetchTopArtists } from "./fetchTopArtists.mjs";
import { fetchTotalStars } from "./fetchTotalStars.mjs";
import { fetchWakatimeLanguages } from "./fetchWakatimeLanguages.mjs";
import { renderBlogPosts } from "./renderBlogPosts.mjs";
import { renderLanguageChartSvg } from "./renderLanguageChartSvg.mjs";
import { renderRecentRepos } from "./renderRecentRepos.mjs";
import { renderStarBadge } from "./renderStarBadge.mjs";
import { renderTopArtists } from "./renderTopArtists.mjs";
import { renderTopArtistsSvg } from "./renderTopArtistsSvg.mjs";
import { replaceSection } from "./replaceSection.mjs";
import { stampAssetVersion } from "./stampAssetVersion.mjs";
import { writeFileIfChanged } from "./writeFileIfChanged.mjs";

/**
 * Refreshes the auto-generated README sections and the SVG files they show:
 * star count, GitHub stats and streak cards, Steam games, most played artists,
 * recent repositories, latest blog posts, and the WakaTime language chart.
 * Each section is independent: when one source fails, that section keeps its
 * previous text and the failure is reported, but the others still update.
 * Secrets are masked in any reported error.
 *
 * @param {{ readmePath: string, githubUser: string, githubDisplayName: string, githubToken?: string, githubStatsSvgPath: string, githubStatsSvgHref: string, githubStreakSvgPath: string, githubStreakSvgHref: string, lastfmUser: string, lastfmApiKey?: string, artistsSvgPath: string, artistsSvgHref: string, steamVanity: string, steamApiKey?: string, steamSvgPath: string, steamSvgHref: string, wakatimeUser: string, wakatimeSvgPath: string, wakatimeSvgHref: string, feedUrl: string }} options - Where to read and write, which accounts to read, and optional credentials.
 * @returns {Promise<{ changed: boolean, failures: string[], skipped: string[] }>} What happened.
 */
export const updateReadme = async (options) => {
  const original = await readFile(options.readmePath, "utf8");
  const failures = [];
  const skipped = [];
  let svgChanged = false;
  const secrets = [options.lastfmApiKey, options.steamApiKey, options.githubToken].filter(Boolean);

  const writeSvg = async (path, text) => {
    svgChanged = (await writeFileIfChanged(path, text)) || svgChanged;
  };

  const sections = [
    {
      name: "STARS",
      build: async () => renderStarBadge(await fetchTotalStars(options.githubUser, options.githubToken), options.githubUser),
    },
    {
      name: "GITHUB_CARDS",
      missing: options.githubToken ? "" : "no GitHub token",
      build: async () => {
        const { markdown, statsSvg, streakSvg } = await buildGithubCards({
          githubUser: options.githubUser,
          displayName: options.githubDisplayName,
          githubToken: options.githubToken,
          statsHref: options.githubStatsSvgHref,
          streakHref: options.githubStreakSvgHref,
        });
        await writeSvg(options.githubStatsSvgPath, statsSvg);
        await writeSvg(options.githubStreakSvgPath, streakSvg);
        return markdown;
      },
    },
    {
      name: "STEAM_GAMES",
      build: async () => {
        const { markdown, svg } = await buildSteamGames({
          steamVanity: options.steamVanity,
          steamApiKey: options.steamApiKey,
          steamSvgHref: options.steamSvgHref,
        });
        await writeSvg(options.steamSvgPath, svg);
        return markdown;
      },
    },
    {
      name: "TOP_ARTISTS",
      missing: options.lastfmApiKey ? "" : "no API key",
      build: async () => {
        const artists = await fetchTopArtists(options.lastfmApiKey, options.lastfmUser, 8);
        const withImages = [];
        for (const artist of artists) {
          withImages.push({ ...artist, imageDataUri: await fetchArtistImage(artist.name) });
        }
        const svg = renderTopArtistsSvg(withImages);
        await writeSvg(options.artistsSvgPath, svg);
        return renderTopArtists(artists, `${options.artistsSvgHref}?v=${contentHash(svg)}`);
      },
    },
    {
      name: "RECENT_REPOS",
      build: async () => renderRecentRepos(await fetchRecentRepos(options.githubUser, 5, options.githubToken)),
    },
    {
      name: "BLOG_POSTS",
      build: async () => renderBlogPosts(await fetchBlogPosts(options.feedUrl, 5)),
    },
  ];

  const maskSecrets = (text) => secrets.reduce((result, secret) => result.replaceAll(secret, "***"), text);

  let updated = original;
  for (const section of sections) {
    if (section.missing) {
      skipped.push(`${section.name} (${section.missing})`);
      continue;
    }
    try {
      updated = replaceSection(updated, section.name, await section.build());
    } catch (error) {
      failures.push(`${section.name}: ${maskSecrets(error.message)}`);
    }
  }

  try {
    const { languages, rangeText } = await fetchWakatimeLanguages(options.wakatimeUser);
    const colors = await fetchLanguageColors();
    const icons = await fetchLanguageIcons(languages.slice(0, 16).map((language) => language.name));
    const chartSvg = renderLanguageChartSvg(languages, colors, rangeText, icons);
    await writeSvg(options.wakatimeSvgPath, chartSvg);
    updated = stampAssetVersion(updated, options.wakatimeSvgHref, chartSvg);
  } catch (error) {
    failures.push(`WAKATIME_CHART: ${maskSecrets(error.message)}`);
  }

  const changed = updated !== original || svgChanged;
  if (updated !== original) {
    await writeFile(options.readmePath, updated);
  }
  return { changed, failures, skipped };
};
