import { fetchJson } from "./fetchJson.mjs";

/**
 * Lists a user's most recently pushed public repositories, skipping forks,
 * archived repositories and the profile repository itself.
 *
 * @param {string} user - The GitHub username.
 * @param {number} limit - How many repositories to return.
 * @param {string | undefined} token - Optional GitHub token (raises the rate limit).
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ name: string, url: string, description: string, language: string, pushedAt: string }[]>} Repositories, most recently pushed first.
 */
export const fetchRecentRepos = async (user, limit, token, fetchImplementation = fetch) => {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const repos = await fetchJson(
    `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=pushed&direction=desc&per_page=30&type=owner`,
    headers,
    fetchImplementation,
  );
  if (!Array.isArray(repos)) {
    throw new Error("GitHub returned an unexpected repositories response.");
  }
  return repos
    .filter((repo) => !repo.fork && !repo.archived && !repo.private && repo.name.toLowerCase() !== user.toLowerCase())
    .slice(0, limit)
    .map((repo) => ({
      name: repo.name,
      url: repo.html_url,
      description: repo.description ?? "",
      language: repo.language ?? "",
      pushedAt: String(repo.pushed_at).slice(0, 10),
    }));
};
