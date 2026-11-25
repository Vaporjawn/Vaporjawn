import { fetchJson } from "./fetchJson.mjs";

/**
 * Reads a user's most played artists over the past month (Last.fm's rolling
 * 30 days) from the Last.fm API.
 *
 * @param {string} apiKey - A Last.fm API key (read-only calls need no secret).
 * @param {string} user - The Last.fm username.
 * @param {number} limit - How many artists to return.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<{ name: string, url: string, playCount: number }[]>} Artists, most played first.
 * @throws {Error} When Last.fm reports an error or returns an unexpected shape.
 */
export const fetchTopArtists = async (apiKey, user, limit, fetchImplementation = fetch) => {
  const query = new URLSearchParams({
    method: "user.gettopartists",
    user,
    period: "1month",
    limit: String(limit),
    format: "json",
    api_key: apiKey,
  });
  const body = await fetchJson(`https://ws.audioscrobbler.com/2.0/?${query}`, {}, fetchImplementation);

  if (body.error) {
    throw new Error(`Last.fm error ${body.error}: ${body.message}`);
  }
  const artists = body?.topartists?.artist;
  if (!Array.isArray(artists)) {
    throw new Error("Last.fm returned no topartists.artist list.");
  }
  return artists.map((artist) => ({
    name: artist.name,
    url: artist.url,
    playCount: Number(artist.playcount),
  }));
};
