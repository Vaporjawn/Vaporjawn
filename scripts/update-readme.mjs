#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { updateReadme } from "./readme/updateReadme.mjs";

/**
 * Command-line entry point: refreshes the README's auto-generated sections.
 * Reads `LASTFM_API_KEY` and `GITHUB_TOKEN` from the environment. Exits with
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
    wakatimeUser: "Vaporjawn",
    githubUser: "Vaporjawn",
    lastfmUser: "Vaporjawn",
    feedUrl: "https://vaporjawn.dev/rss.xml",
    lastfmApiKey: process.env.LASTFM_API_KEY || undefined,
    githubToken: process.env.GITHUB_TOKEN || undefined,
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
