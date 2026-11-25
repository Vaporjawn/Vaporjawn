import { fetchGraphql } from "./fetchGraphql.mjs";
import { fetchJson } from "./fetchJson.mjs";
import { fetchTotalStars } from "./fetchTotalStars.mjs";

/**
 * Collects public-only profile numbers, so the result is the same whoever
 * runs it (a personal token and the Actions token see different private
 * data, which would make the card flip between runs).
 *
 * @param {string} user - The GitHub username (letters, digits and hyphens).
 * @param {string} token - A GitHub token.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ stars: number, publicRepos: number, followers: number, pullRequests: number, issues: number }>} The numbers.
 * @throws {Error} When the username is malformed or a request fails.
 */
export const fetchProfileStats = async (user, token, fetchImplementation = fetch) => {
  if (!/^[A-Za-z0-9-]+$/.test(user)) {
    throw new Error("Invalid GitHub username.");
  }
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` };
  const [stars, profile, counts] = await Promise.all([
    fetchTotalStars(user, token, fetchImplementation),
    fetchJson(`https://api.github.com/users/${user}`, headers, fetchImplementation),
    fetchGraphql(
      `{
        pullRequests: search(query: "author:${user} is:pr is:public", type: ISSUE, first: 1) { issueCount }
        issues: search(query: "author:${user} is:issue is:public", type: ISSUE, first: 1) { issueCount }
      }`,
      {},
      token,
      fetchImplementation,
    ),
  ]);
  return {
    stars,
    publicRepos: Number(profile.public_repos) || 0,
    followers: Number(profile.followers) || 0,
    pullRequests: counts.pullRequests.issueCount,
    issues: counts.issues.issueCount,
  };
};
