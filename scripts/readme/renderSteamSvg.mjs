import { escapeXml } from "./escapeXml.mjs";
import { formatHours } from "./formatHours.mjs";

const TILE_WIDTH = 512;
const TILE_HEIGHT = 239;
const COLUMNS = 3;
const MARGIN = 78;
const HEADER_HEIGHT = 152;
const BOTTOM_MARGIN = 40;
const MAX_NAME_LENGTH = 30;
const FONT = "'Barlow Condensed', 'Barlow', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

/**
 * Picks a stable dark colour for a game with no picture, from its name.
 *
 * @param {string} name - The game name.
 * @returns {string} An `hsl(...)` colour.
 */
const placeholderColor = (name) => {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return `hsl(${hash}, 30%, 24%)`;
};

/**
 * Draws the Steam games grid as a self-contained SVG in the same style as the
 * Last.fm artist grid: a dark panel, a title row, and picture tiles (three per
 * row) each with the game name, hours on record, and hours in the last two
 * weeks when there are any. Pictures are embedded as data URIs.
 *
 * @param {{ name: string, hoursLastTwoWeeks: number, hoursTotal: number, imageDataUri: string | null }[]} games - Games, best first.
 * @returns {string} The SVG document text.
 */
export const renderSteamSvg = (games) => {
  const columns = Math.max(1, Math.min(COLUMNS, games.length));
  const rows = Math.max(1, Math.ceil(games.length / COLUMNS));
  const width = MARGIN * 2 + TILE_WIDTH * columns;
  const height = HEADER_HEIGHT + TILE_HEIGHT * rows + BOTTOM_MARGIN;

  const tiles = games
    .map((game, index) => {
      const x = MARGIN + (index % COLUMNS) * TILE_WIDTH;
      const y = HEADER_HEIGHT + Math.floor(index / COLUMNS) * TILE_HEIGHT;
      const name = game.name.length > MAX_NAME_LENGTH ? `${game.name.slice(0, MAX_NAME_LENGTH - 1)}…` : game.name;
      const picture = game.imageDataUri
        ? `<image href="${game.imageDataUri}" x="${x}" y="${y}" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tile-${index})"/>`
        : `<rect x="${x}" y="${y}" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" fill="${placeholderColor(game.name)}"/>`;
      const recent =
        game.hoursLastTwoWeeks > 0
          ? `\n  <text x="${x + 28}" y="${y + TILE_HEIGHT - 22}" font-size="22" font-weight="600" fill="#66c0f4">${escapeXml(formatHours(game.hoursLastTwoWeeks))} hrs in the last 2 weeks</text>`
          : "";
      return [
        `<clipPath id="tile-${index}"><rect x="${x}" y="${y}" width="${TILE_WIDTH}" height="${TILE_HEIGHT}"/></clipPath>`,
        picture,
        `<rect x="${x}" y="${y}" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" fill="url(#shade)"/>`,
        `<text x="${x + 28}" y="${y + TILE_HEIGHT - 78}" font-size="30" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>`,
        `<text x="${x + 28}" y="${y + TILE_HEIGHT - 48}" font-size="22" fill="#ffffff" fill-opacity="0.92">${escapeXml(formatHours(game.hoursTotal))} hrs on record</text>${recent}`,
      ].join("\n  ");
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Steam games, recently played first, then most played" font-family="${FONT}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#0d0f14"/>
  <text x="${MARGIN}" y="106" font-size="50" font-weight="500" fill="#ffffff">Steam Games</text>
  <text x="${width - MARGIN}" y="104" font-size="30" font-weight="500" fill="#b4b9c2" text-anchor="end">Recent play first, then most played</text>
  ${tiles}
</svg>
`;
};
