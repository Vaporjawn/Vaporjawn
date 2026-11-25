import { fetchImageDataUri } from "./fetchImageDataUri.mjs";
import { fetchJson } from "./fetchJson.mjs";

const MAX_IMAGE_BYTES = 250_000;

/**
 * Finds a photo for an artist on Deezer (Last.fm no longer serves real artist
 * photos through its API) and returns it as a base64 data URI so it can be
 * embedded in an SVG. Only an exact (case-insensitive) name match is accepted,
 * so a wrong artist's photo is never shown.
 *
 * @param {string} artistName - The artist name as Last.fm reports it.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<string | null>} A `data:image/jpeg;base64,...` URI, or null when no safe match exists.
 */
export const fetchArtistImage = async (artistName, fetchImplementation = fetch) => {
  try {
    const search = await fetchJson(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=5`,
      {},
      fetchImplementation,
    );
    const match = (search?.data ?? []).find(
      (artist) => String(artist.name).toLowerCase() === artistName.toLowerCase() && artist.picture_big,
    );
    return match ? await fetchImageDataUri(match.picture_big, MAX_IMAGE_BYTES, fetchImplementation) : null;
  } catch {
    return null;
  }
};
