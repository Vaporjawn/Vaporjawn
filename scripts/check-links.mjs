#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { checkLinks } from "./linkcheck/checkLinks.mjs";
import { syncIssue } from "./linkcheck/syncIssue.mjs";

/**
 * Command-line entry point for the weekly README link and image check.
 * Prints every broken address; when run in GitHub Actions (with `GITHUB_TOKEN`
 * and `GITHUB_REPOSITORY`) it also opens, updates or closes a tracking issue.
 * Exits with code 1 when anything is broken.
 *
 * @returns {Promise<void>}
 */
const main = async () => {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const markdown = await readFile(`${repoRoot}README.md`, "utf8");
  const results = await checkLinks({ markdown, repoRoot, singlePageOrigins: ["https://vaporjawn.dev"] });

  const broken = results.filter((result) => result.verdict === "broken");
  const blocked = results.filter((result) => result.verdict === "blocked");
  console.log(`Checked ${results.length} addresses: ${results.length - broken.length - blocked.length} ok, ${blocked.length} not verifiable, ${broken.length} broken.`);
  for (const result of blocked) {
    console.log(`  not verifiable: ${result.url} (${result.detail})`);
  }
  for (const result of broken) {
    console.error(`  BROKEN ${result.kind}: ${result.url} (${result.detail})`);
  }

  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    const runUrl = process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : "";
    const action = await syncIssue({ results, repository: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN, runUrl });
    console.log(`Tracking issue: ${action}.`);
  }
  if (broken.length > 0) {
    process.exitCode = 1;
  }
};

await main();
