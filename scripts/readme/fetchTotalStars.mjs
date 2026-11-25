import { fetchJson } from "./fetchJson.mjs";

/**
 * Adds up the stars on all of a user's own (non-fork) public repositories,
 * following GitHub's pagination.
 *
 * @param {string} user - The GitHub username.
 * @param {string | undefined} token - Optional GitHub token (raises the rate limit).
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<number>} The total star count.
 */
export const fetchTotalStars = async (user, token, fetchImplementation = fetch) => {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let total = 0;
  for (let page = 1; page <= 20; page += 1) {
    const repos = await fetchJson(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&page=${page}`,
      headers,
      fetchImplementation,
    );
    if (!Array.isArray(repos)) {
      throw new Error("GitHub returned an unexpected repositories response.");
    }
    total += repos.filter((repo) => !repo.fork).reduce((sum, repo) => sum + (Number(repo.stargazers_count) || 0), 0);
    if (repos.length < 100) {
      return total;
    }
  }
  return total;
};
