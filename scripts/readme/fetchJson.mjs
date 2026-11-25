/**
 * Fetches a URL and returns the parsed JSON body, failing loudly on any
 * non-2xx status or a request that takes longer than the timeout.
 *
 * @param {string} url - The URL to request.
 * @param {Record<string, string>} [headers] - Extra request headers.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<any>} The parsed JSON response.
 * @throws {Error} When the response is not OK or the body is not JSON.
 */
export const fetchJson = async (url, headers = {}, fetchImplementation = fetch) => {
  const response = await fetchImplementation(url, {
    headers: { "User-Agent": "Vaporjawn-readme-updater", ...headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}: ${new URL(url).origin}${new URL(url).pathname}`);
  }
  return response.json();
};
