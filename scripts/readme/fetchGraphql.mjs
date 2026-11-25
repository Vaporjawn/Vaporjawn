/**
 * Runs a GraphQL query against the GitHub API and returns its `data`, failing
 * loudly on an HTTP error or a GraphQL error.
 *
 * @param {string} query - The GraphQL document.
 * @param {Record<string, unknown>} variables - Query variables.
 * @param {string} token - A GitHub token (the Actions `GITHUB_TOKEN` works for public data).
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<any>} The `data` object of the response.
 * @throws {Error} When the request fails or the response contains errors.
 */
export const fetchGraphql = async (query, variables, token, fetchImplementation = fetch) => {
  const response = await fetchImplementation("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Vaporjawn-readme-updater",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed with HTTP ${response.status}.`);
  }
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${body.errors[0].message}`);
  }
  return body.data;
};
