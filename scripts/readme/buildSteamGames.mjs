import { contentHash } from "./contentHash.mjs";
import { fetchImageDataUri } from "./fetchImageDataUri.mjs";
import { fetchOwnedGames } from "./fetchOwnedGames.mjs";
import { fetchSteamProfile } from "./fetchSteamProfile.mjs";
import { renderSteamSection } from "./renderSteamSection.mjs";
import { renderSteamSvg } from "./renderSteamSvg.mjs";
import { selectSteamGames } from "./selectSteamGames.mjs";

const MAX_IMAGE_BYTES = 150_000;

/**
 * Builds the Steam games grid. With an API key it uses the whole library
 * (recent play first, then most played); without one, or when the account's
 * game details are private, it falls back to the games listed on the public
 * profile (only those played in the last two weeks).
 *
 * @param {{ steamVanity: string, steamApiKey?: string, steamSvgHref: string }} options - Profile name, optional key, and the image path.
 * @param {{ fetchImplementation?: typeof fetch }} [dependencies] - Injectable fetch, for tests.
 * @returns {Promise<{ markdown: string, svg: string }>} The README markup and the SVG document.
 * @throws {Error} When the profile is private or no games can be found.
 */
export const buildSteamGames = async (options, dependencies = {}) => {
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const profile = await fetchSteamProfile(options.steamVanity, fetchImplementation);
  if (!profile.isPublic) {
    throw new Error("Steam profile is not public.");
  }

  let candidates = [];
  if (options.steamApiKey) {
    candidates = await fetchOwnedGames(options.steamApiKey, profile.steamId, fetchImplementation).catch(() => []);
  }
  if (candidates.length === 0) {
    candidates = profile.recentGames;
  }
  const games = selectSteamGames(candidates, 6);
  if (games.length === 0) {
    throw new Error("No Steam games found (are the profile's game details public?).");
  }

  const withImages = await Promise.all(
    games.map(async (game) => ({
      ...game,
      imageDataUri: await fetchImageDataUri(
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
        MAX_IMAGE_BYTES,
        fetchImplementation,
      ),
    })),
  );
  const svg = renderSteamSvg(withImages);
  const markdown = renderSteamSection(
    games,
    `${options.steamSvgHref}?v=${contentHash(svg)}`,
    `https://steamcommunity.com/id/${options.steamVanity}`,
  );
  return { markdown, svg };
};
