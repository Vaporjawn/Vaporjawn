/**
 * Reads a public Steam profile's XML (no API key needed): the numeric account
 * id, the privacy state, and the games played in the last two weeks.
 *
 * @param {string} vanity - The custom profile name, as in `steamcommunity.com/id/<vanity>`.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ steamId: string, isPublic: boolean, recentGames: { appId: number, name: string, hoursLastTwoWeeks: number, hoursTotal: number }[] }>} The profile summary.
 * @throws {Error} When the profile cannot be read or has no account id.
 */
export const fetchSteamProfile = async (vanity, fetchImplementation = fetch) => {
  if (!/^[A-Za-z0-9_-]+$/.test(vanity)) {
    throw new Error("Invalid Steam profile name.");
  }
  const response = await fetchImplementation(`https://steamcommunity.com/id/${vanity}/?xml=1`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Vaporjawn-readme-updater)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Steam profile request failed with HTTP ${response.status}.`);
  }
  const xml = await response.text();

  const readTag = (source, tag) => {
    const match = source.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`));
    return match ? match[1].trim() : "";
  };
  const toNumber = (text) => Number(text.replaceAll(",", "")) || 0;

  const steamId = readTag(xml, "steamID64");
  if (!/^\d{17}$/.test(steamId)) {
    throw new Error("Steam profile has no account id (is the profile name right?).");
  }
  const recentGames = [...xml.matchAll(/<mostPlayedGame>([\s\S]*?)<\/mostPlayedGame>/g)]
    .map(([, block]) => ({
      appId: Number(readTag(block, "gameLink").match(/\/app\/(\d+)/)?.[1]),
      name: readTag(block, "gameName"),
      hoursLastTwoWeeks: toNumber(readTag(block, "hoursPlayed")),
      hoursTotal: toNumber(readTag(block, "hoursOnRecord")),
    }))
    .filter((game) => Number.isInteger(game.appId) && game.appId > 0 && game.name !== "");
  return { steamId, isPublic: readTag(xml, "privacyState") === "public", recentGames };
};
