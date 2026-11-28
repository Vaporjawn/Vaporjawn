#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { updateReadme } from "./readme/updateReadme.mjs";

/**
 * Command-line entry point: refreshes the README's auto-generated sections.
 * Reads `LASTFM_API_KEY`, `GITHUB_TOKEN` and `LINES_GITHUB_TOKEN` (a personal access token that can read private repositories, for the lines-of-code chart) from the environment. Exits with
 * code 1 when any section that was attempted failed, so the workflow run
 * shows red instead of silently serving stale content.
 *
 * @returns {Promise<void>}
 */
const main = async () => {
  const result = await updateReadme({
    readmePath: fileURLToPath(new URL("../README.md", import.meta.url)),
    artistsSvgPath: fileURLToPath(new URL("../assets/top-artists.svg", import.meta.url)),
    artistsSvgHref: "./assets/top-artists.svg",
    wakatimeSvgPath: fileURLToPath(new URL("../assets/wakatime-languages.svg", import.meta.url)),
    githubDisplayName: "Victor Williams",
    githubStatsSvgPath: fileURLToPath(new URL("../assets/github-stats.svg", import.meta.url)),
    githubStatsSvgHref: "./assets/github-stats.svg",
    githubStreakSvgPath: fileURLToPath(new URL("../assets/github-streak.svg", import.meta.url)),
    githubStreakSvgHref: "./assets/github-streak.svg",
    steamVanity: "vaporjawn",
    steamApiKey: process.env.STEAM_API_KEY || undefined,
    steamSvgPath: fileURLToPath(new URL("../assets/steam-games.svg", import.meta.url)),
    steamSvgHref: "./assets/steam-games.svg",
    linesSvgPath: fileURLToPath(new URL("../assets/lines-of-code-languages.svg", import.meta.url)),
    linesSvgHref: "./assets/lines-of-code-languages.svg",
    linesExcludedRepositories: [
      "better-discord-themes", // a curated collection of other people's themes
      "Ludaro", // bundles other people's emulator engines and their upstream sources
      "Morgan-Lewis-Vault", // notes vault holding many duplicate snapshots of the same work source
    ],
    linesCachePath: fileURLToPath(new URL("../assets/lines-of-code-cache.json", import.meta.url)),
    wakatimeSvgHref: "./assets/wakatime-languages.svg",
    wakatimeUser: "Vaporjawn",
    githubUser: "Vaporjawn",
    lastfmUser: "Vaporjawn",
    feedUrl: "https://vaporjawn.dev/rss.xml",
    lastfmApiKey: process.env.LASTFM_API_KEY || undefined,
    githubToken: process.env.GITHUB_TOKEN || undefined,
    linesToken: process.env.LINES_GITHUB_TOKEN || undefined,
  });

  console.log(result.changed ? "README.md updated." : "README.md already up to date.");
  for (const skipped of result.skipped) {
    console.log(`Skipped ${skipped}.`);
  }
  for (const failure of result.failures) {
    console.error(`FAILED ${failure}`);
  }
  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
};

await main();
