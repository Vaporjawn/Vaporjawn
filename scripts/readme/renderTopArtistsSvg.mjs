import { escapeXml } from "./escapeXml.mjs";

const TILE = 384;
const GRID_COLUMNS = 4;
const MARGIN = 78;
const HEADER_HEIGHT = 152;
const BOTTOM_MARGIN = 40;
const MAX_NAME_LENGTH = 22;
const FONT = "'Barlow Condensed', 'Barlow', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

/**
 * Picks a stable dark colour for an artist with no photo, from its name.
 *
 * @param {string} name - The artist name.
 * @returns {string} An `hsl(...)` colour.
 */
const placeholderColor = (name) => {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return `hsl(${hash}, 35%, 26%)`;
};

/**
 * Draws the "Top Artists, Last 30 days" photo grid as a self-contained SVG:
 * a dark panel, a title row, and square tiles (four per row) with the artist
 * photo, a bottom shade, the artist name and the play count. Photos are
 * embedded as data URIs because an SVG shown through `<img>` cannot load
 * external files.
 *
 * @param {{ name: string, playCount: number, imageDataUri: string | null }[]} artists - Artists, most played first.
 * @returns {string} The SVG document text.
 */
export const renderTopArtistsSvg = (artists) => {
  const rows = Math.max(1, Math.ceil(artists.length / GRID_COLUMNS));
  const width = MARGIN * 2 + TILE * GRID_COLUMNS;
  const height = HEADER_HEIGHT + TILE * rows + BOTTOM_MARGIN;

  const tiles = artists
    .map((artist, index) => {
      const x = MARGIN + (index % GRID_COLUMNS) * TILE;
      const y = HEADER_HEIGHT + Math.floor(index / GRID_COLUMNS) * TILE;
      const name = artist.name.length > MAX_NAME_LENGTH ? `${artist.name.slice(0, MAX_NAME_LENGTH - 1)}…` : artist.name;
      const plays = `${artist.playCount.toLocaleString("en-US")} ${artist.playCount === 1 ? "play" : "plays"}`;
      const picture = artist.imageDataUri
        ? `<image href="${artist.imageDataUri}" x="${x}" y="${y}" width="${TILE}" height="${TILE}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tile-${index})"/>`
        : `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="${placeholderColor(artist.name)}"/>`;
      return [
        `<clipPath id="tile-${index}"><rect x="${x}" y="${y}" width="${TILE}" height="${TILE}"/></clipPath>`,
        picture,
        `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="url(#shade)"/>`,
        `<text x="${x + 30}" y="${y + TILE - 84}" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>`,
        `<text x="${x + 30}" y="${y + TILE - 46}" font-size="23" fill="#ffffff" fill-opacity="0.92">${escapeXml(plays)}</text>`,
      ].join("\n  ");
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Top artists, last 30 days" font-family="${FONT}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#0d0f14"/>
  <text x="${MARGIN}" y="106" font-size="50" font-weight="500" fill="#ffffff">Top Artists</text>
  <text x="${width - MARGIN}" y="104" font-size="30" font-weight="500" fill="#b4b9c2" text-anchor="end">Last 30 days</text>
  ${tiles}
</svg>
`;
};
