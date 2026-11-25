/**
 * Lists the games a Steam account owns, with playtime, through the Steam Web
 * API. The account's "game details" privacy setting must be public, otherwise
 * Steam returns an empty list. The key travels only in the request URL and is
 * never included in an error message.
 *
 * @param {string} apiKey - A Steam Web API key.
 * @param {string} steamId - The 17-digit account id.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ appId: number, name: string, hoursLastTwoWeeks: number, hoursTotal: number }[]>} Owned games (possibly empty).
 * @throws {Error} When the request fails.
 */
export const fetchOwnedGames = async (apiKey, steamId, fetchImplementation = fetch) => {
  const query = new URLSearchParams({
    key: apiKey,
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1",
    format: "json",
  });
  const response = await fetchImplementation(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${query}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) {
    throw new Error(`Steam Web API request failed with HTTP ${response.status}.`);
  }
  const body = await response.json();
  return (body?.response?.games ?? []).map((game) => ({
    appId: Number(game.appid),
    name: String(game.name ?? ""),
    hoursLastTwoWeeks: (Number(game.playtime_2weeks) || 0) / 60,
    hoursTotal: (Number(game.playtime_forever) || 0) / 60,
  }));
};
