import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cloneRepository } from "./cloneRepository.mjs";
import { countLinesInDirectory } from "./countLinesInDirectory.mjs";
import { fetchJson } from "./fetchJson.mjs";
import { openPrivateCache } from "./openPrivateCache.mjs";

/**
 * Counts lines of code per language across a user's non-fork, non-archived
 * repositories: all of them (private included) when the token can list them,
 * otherwise only the public ones. A repository is cloned and recounted only when
 * its last push time differs from the one in the cache, so hourly runs
 * normally clone nothing. Public repositories are cached in `cachePath`, which
 * is committed, but private ones (their names, push times and per-language
 * counts) go only in `privateCachePath`, an encrypted file (see
 * `sealPrivateCache`) that must never be committed.
 * Repositories larger than `maxRepositoryKilobytes` (default 1 GB, almost always media rather than code) and those named in `excludedRepositories` (collections of other people's code) are skipped. A repository that cannot be cloned keeps its cached
 * counts (or counts as empty) instead of failing the chart.
 *
 * @param {string} user - The GitHub username.
 * @param {string | undefined} token - Optional GitHub token. A token owned by `user` with repository read access also covers private repositories.
 * @param {string} cachePath - JSON file holding `{ [repo]: { pushedAt, counts } }` for public repositories from the last run.
 * @param {string | undefined} privateCachePath - Same, for private repositories; a file outside git. Without it private repositories are recounted every run.
 * @param {{ excludedRepositories?: string[], maxRepositoryKilobytes?: number, fetchImplementation?: typeof fetch, clone?: typeof cloneRepository, count?: typeof countLinesInDirectory }} [overrides] - Injectable pieces, for tests.
 * @returns {Promise<{ languages: { name: string, lines: number, percent: number }[], repositoryCount: number, totalLines: number, cache: Record<string, { pushedAt: string, counts: Record<string, number> }>, privateCache: Record<string, { pushedAt: string, counts: Record<string, number> }> }>} Languages, largest first, and the updated public and private caches.
 * @throws {Error} When the repository list is unavailable or no code is found.
 */
export const fetchLineCounts = async (user, token, cachePath, privateCachePath, overrides = {}) => {
  const { excludedRepositories = [], maxRepositoryKilobytes = 1_000_000, fetchImplementation = fetch, clone = cloneRepository, count = countLinesInDirectory } = overrides;
  const headers = { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await fetchJson(
      token
        ? `https://api.github.com/user/repos?affiliation=owner&visibility=all&per_page=100&page=${page}`
        : `https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&per_page=100&page=${page}`,
      headers,
      fetchImplementation,
    );
    if (!Array.isArray(batch)) throw new Error("GitHub returned an unexpected repositories response.");
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const wanted = repos.filter((repo) => !repo.fork && !repo.archived && !excludedRepositories.includes(repo.name) && !(repo.size > maxRepositoryKilobytes));
  const previousPublic = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
  const previousPrivate = privateCachePath ? openPrivateCache(await readFile(privateCachePath, "utf8").catch(() => ""), token) : {};
  const cache = {};
  const privateCache = {};
  for (const repo of wanted) {
    const pushedAt = String(repo.pushed_at);
    const key = repo.name;
    const previous = repo.private ? previousPrivate : previousPublic;
    const target = repo.private ? privateCache : cache;
    if (previous[key]?.pushedAt === pushedAt) {
      target[key] = previous[key];
      continue;
    }
    const folder = await mkdtemp(join(tmpdir(), "lines-"));
    try {
      await clone(repo.clone_url, folder, repo.private ? token : undefined);
      target[key] = { pushedAt, counts: Object.fromEntries(await count(folder)) };
    } catch {
      target[key] = previous[key] ?? { pushedAt: "", counts: {} };
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
  const totals = new Map();
  for (const { counts } of [...Object.values(cache), ...Object.values(privateCache)]) {
    for (const [name, lines] of Object.entries(counts)) totals.set(name, (totals.get(name) ?? 0) + lines);
  }
  const totalLines = [...totals.values()].reduce((sum, lines) => sum + lines, 0);
  if (totalLines <= 0) throw new Error("No lines of code found in the repositories.");
  const languages = [...totals]
    .map(([name, lines]) => ({ name, lines, percent: (lines / totalLines) * 100 }))
    .sort((a, b) => b.lines - a.lines);
  return { languages, repositoryCount: wanted.length, totalLines, cache, privateCache };
};
