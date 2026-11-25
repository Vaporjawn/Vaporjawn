import { readFile, writeFile } from "node:fs/promises";
import { fetchBlogPosts } from "./fetchBlogPosts.mjs";
import { fetchRecentRepos } from "./fetchRecentRepos.mjs";
import { fetchTopArtists } from "./fetchTopArtists.mjs";
import { renderBlogPosts } from "./renderBlogPosts.mjs";
import { renderRecentRepos } from "./renderRecentRepos.mjs";
import { renderTopArtists } from "./renderTopArtists.mjs";
import { replaceSection } from "./replaceSection.mjs";

/**
 * Refreshes the auto-generated README sections (recent repositories, latest
 * blog posts, most played artists). Each section is independent: when one
 * source fails, that section keeps its previous text and the failure is
 * reported, but the others still update.
 *
 * @param {{ readmePath: string, githubUser: string, lastfmUser: string, feedUrl: string, lastfmApiKey?: string, githubToken?: string }} options - Where to read and write, and which accounts to read.
 * @returns {Promise<{ changed: boolean, failures: string[], skipped: string[] }>} What happened.
 */
export const updateReadme = async (options) => {
  const original = await readFile(options.readmePath, "utf8");
  const failures = [];
  const skipped = [];

  const sections = [
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
      build: async () => renderTopArtists(await fetchTopArtists(options.lastfmApiKey, options.lastfmUser, 8)),
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

  const changed = updated !== original;
  if (changed) {
    await writeFile(options.readmePath, updated);
  }
  return { changed, failures, skipped };
};
