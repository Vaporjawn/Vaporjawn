import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cloneRepository } from "./cloneRepository.mjs";
import { countLinesInDirectory } from "./countLinesInDirectory.mjs";
import { fetchJson } from "./fetchJson.mjs";

/**
 * Counts lines of code per language across a user's public, non-fork,
 * non-archived repositories. A repository is cloned and recounted only when
 * its last push time differs from the one in the cache, so hourly runs
 * normally clone nothing. Repositories named in `excludedRepositories` (collections of other people's code) are skipped. A repository that cannot be cloned keeps its cached
 * counts (or counts as empty) instead of failing the chart.
 *
 * @param {string} user - The GitHub username.
 * @param {string | undefined} token - Optional GitHub token (raises the API rate limit).
 * @param {string} cachePath - JSON file holding `{ [repo]: { pushedAt, counts } }` from the last run.
 * @param {{ excludedRepositories?: string[], fetchImplementation?: typeof fetch, clone?: typeof cloneRepository, count?: typeof countLinesInDirectory }} [overrides] - Injectable pieces, for tests.
 * @returns {Promise<{ languages: { name: string, lines: number, percent: number }[], repositoryCount: number, totalLines: number, cache: Record<string, { pushedAt: string, counts: Record<string, number> }> }>} Languages, largest first, and the updated cache.
 * @throws {Error} When the repository list is unavailable or no code is found.
 */
export const fetchLineCounts = async (user, token, cachePath, overrides = {}) => {
  const { excludedRepositories = [], fetchImplementation = fetch, clone = cloneRepository, count = countLinesInDirectory } = overrides;
  const headers = { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await fetchJson(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&per_page=100&page=${page}`,
      headers,
      fetchImplementation,
    );
    if (!Array.isArray(batch)) throw new Error("GitHub returned an unexpected repositories response.");
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const wanted = repos.filter((repo) => !repo.fork && !repo.archived && !repo.private && !excludedRepositories.includes(repo.name));
  const previous = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
  const cache = {};
  for (const repo of wanted) {
    const pushedAt = String(repo.pushed_at);
    if (previous[repo.name]?.pushedAt === pushedAt) {
      cache[repo.name] = previous[repo.name];
      continue;
    }
    const folder = await mkdtemp(join(tmpdir(), "lines-"));
    try {
      await clone(repo.clone_url, folder);
      cache[repo.name] = { pushedAt, counts: Object.fromEntries(await count(folder)) };
    } catch {
      cache[repo.name] = previous[repo.name] ?? { pushedAt: "", counts: {} };
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
  const totals = new Map();
  for (const { counts } of Object.values(cache)) {
    for (const [name, lines] of Object.entries(counts)) totals.set(name, (totals.get(name) ?? 0) + lines);
  }
  const totalLines = [...totals.values()].reduce((sum, lines) => sum + lines, 0);
  if (totalLines <= 0) throw new Error("No lines of code found in public repositories.");
  const languages = [...totals]
    .map(([name, lines]) => ({ name, lines, percent: (lines / totalLines) * 100 }))
    .sort((a, b) => b.lines - a.lines);
  return { languages, repositoryCount: wanted.length, totalLines, cache };
};
