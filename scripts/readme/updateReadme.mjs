import { readFile, writeFile } from "node:fs/promises";
import { contentHash } from "./contentHash.mjs";
import { fetchArtistImage } from "./fetchArtistImage.mjs";
import { fetchLanguageIcons } from "./fetchLanguageIcons.mjs";
import { fetchLanguageColors } from "./fetchLanguageColors.mjs";
import { fetchBlogPosts } from "./fetchBlogPosts.mjs";
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
import { stampAssetVersion } from "./stampAssetVersion.mjs";
import { replaceSection } from "./replaceSection.mjs";
import { writeFileIfChanged } from "./writeFileIfChanged.mjs";

/**
 * Refreshes the auto-generated README sections (star count, recent repositories,
 * latest blog posts, most played artists, WakaTime language chart). Each section is independent: when one
 * source fails, that section keeps its previous text and the failure is
 * reported, but the others still update.
 *
 * @param {{ readmePath: string, artistsSvgPath: string, artistsSvgHref: string, wakatimeSvgPath: string, wakatimeSvgHref: string, wakatimeUser: string, githubUser: string, lastfmUser: string, feedUrl: string, lastfmApiKey?: string, githubToken?: string }} options - Where to read and write, and which accounts to read.
 * @returns {Promise<{ changed: boolean, failures: string[], skipped: string[] }>} What happened.
 */
export const updateReadme = async (options) => {
  const original = await readFile(options.readmePath, "utf8");
  const failures = [];
  const skipped = [];
  let svgChanged = false;

  const sections = [
    {
      name: "STARS",
      build: async () => renderStarBadge(await fetchTotalStars(options.githubUser, options.githubToken)),
    },
    {
      name: "RECENT_REPOS",
      build: async () => renderRecentRepos(await fetchRecentRepos(options.githubUser, 5, options.githubToken)),
    },
    {
      name: "BLOG_POSTS",
      build: async () => renderBlogPosts(await fetchBlogPosts(options.feedUrl, 5)),
    },
    {
      name: "TOP_ARTISTS",
      build: async () => {
        const artists = await fetchTopArtists(options.lastfmApiKey, options.lastfmUser, 8);
        const withImages = [];
        for (const artist of artists) {
          withImages.push({ ...artist, imageDataUri: await fetchArtistImage(artist.name) });
        }
        const svg = renderTopArtistsSvg(withImages);
        svgChanged = (await writeFileIfChanged(options.artistsSvgPath, svg)) || svgChanged;
        return renderTopArtists(artists, `${options.artistsSvgHref}?v=${contentHash(svg)}`);
      },
      requires: options.lastfmApiKey,
    },
  ];

  let updated = original;
  for (const section of sections) {
    if ("requires" in section && !section.requires) {
      skipped.push(`${section.name} (no API key)`);
      continue;
    }
    try {
      updated = replaceSection(updated, section.name, await section.build());
    } catch (error) {
      failures.push(`${section.name}: ${error.message.replaceAll(options.lastfmApiKey ?? "\u0000", "***")}`);
    }
  }

  try {
    const { languages, rangeText } = await fetchWakatimeLanguages(options.wakatimeUser);
    const colors = await fetchLanguageColors();
    const icons = await fetchLanguageIcons(languages.slice(0, 16).map((language) => language.name));
    const chartSvg = renderLanguageChartSvg(languages, colors, rangeText, icons);
    svgChanged = (await writeFileIfChanged(options.wakatimeSvgPath, chartSvg)) || svgChanged;
    updated = stampAssetVersion(updated, options.wakatimeSvgHref, chartSvg);
  } catch (error) {
    failures.push(`WAKATIME_CHART: ${error.message}`);
  }

  const changed = updated !== original || svgChanged;
  if (updated !== original) {
    await writeFile(options.readmePath, updated);
  }
  return { changed, failures, skipped };
};
