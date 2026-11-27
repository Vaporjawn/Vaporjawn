import { escapeXml } from "./escapeXml.mjs";

const WIDTH = 800;
const LEGEND_ROWS = 16;
const ROW_HEIGHT = 25;
const CENTER_X = 580;
const OUTER_RADIUS = 175;
const INNER_RADIUS = 108;
const TILE_FILL = "#2e3b49";
const GLYPH_WIDTH = 9;
const DARK_TEXT = "#10161d";
const LIGHT_GLYPH = "#d6dde6";
const FONT = "'SF Mono', 'Menlo', 'Consolas', 'DejaVu Sans Mono', monospace";

/**
 * Picks a stable colour for a language WakaTime has no colour for.
 *
 * @param {string} name - The language name.
 * @returns {string} An `hsl(...)` colour.
 */
const fallbackColor = (name) => {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return `hsl(${hash}, 50%, 52%)`;
};

/**
 * Chooses a logo colour that stays readable on the dark tile: the brand
 * colour, or a light grey when the brand colour is nearly black.
 *
 * @param {string} hex - Brand colour as `rrggbb`.
 * @returns {string} A `#rrggbb` colour.
 */
const readableOnDark = (hex) => {
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance < 0.2 ? LIGHT_GLYPH : `#${hex}`;
};

/**
 * Chooses black-ish or white text for a highlight of the given colour.
 *
 * @param {string} color - A `#rrggbb` or other CSS colour.
 * @returns {string} The text colour with the better contrast.
 */
const textColorOn = (color) => {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!match) {
    return "#ffffff";
  }
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.5 ? DARK_TEXT : "#ffffff";
};

/**
 * Builds the SVG path of one donut slice.
 *
 * @param {number} centerY - Vertical centre of the donut.
 * @param {number} startAngle - Start, in radians clockwise from twelve o'clock.
 * @param {number} endAngle - End, in radians clockwise from twelve o'clock.
 * @returns {string} The path `d` attribute.
 */
const slicePath = (centerY, startAngle, endAngle) => {
  const point = (radius, angle) =>
    `${(CENTER_X + radius * Math.sin(angle)).toFixed(2)} ${(centerY - radius * Math.cos(angle)).toFixed(2)}`;
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${point(OUTER_RADIUS, startAngle)} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${point(OUTER_RADIUS, endAngle)} L ${point(INNER_RADIUS, endAngle)} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${point(INNER_RADIUS, startAngle)} Z`;
};

/**
 * Draws the language donut chart as a self-contained SVG: a title, a legend
 * of the biggest languages with their share, and a donut of every language.
 * The shares passed in already exclude WakaTime's "Other" bucket.
 *
 * @param {{ name: string, percent: number }[]} languages - Languages, largest first, percentages summing to 100.
 * @param {Map<string, string>} colors - Lower-cased language name to colour.
 * @param {string} rangeText - WakaTime's wording for the date range, e.g. "since Feb 28 2020".
 * @param {Map<string, { path: string, hex: string }>} [icons] - Lower-cased language name to logo path and colour; languages without one get a letter badge.
 * @param {{ title?: string, subtitle?: string, ariaLabel?: string }} [labels] - Heading, sub-heading (already XML-safe text; defaults to the WakaTime wording) and accessible name.
 * @returns {string} The SVG document text.
 */
export const renderLanguageChartSvg = (languages, colors, rangeText, icons = new Map(), labels = {}) => {
  const title = labels.title ?? "Languages by coding time";
  const subtitle = labels.subtitle ?? `Excluding &quot;Other&quot; · ${escapeXml(rangeText)} · powered by wakatime.com`;
  const ariaLabel = labels.ariaLabel ?? "Languages by coding time, all time, excluding unclassified time";
  const height = 96 + LEGEND_ROWS * ROW_HEIGHT + 24;
  const centerY = 96 + (LEGEND_ROWS * ROW_HEIGHT) / 2;
  const colorOf = (language) => colors.get(language.name.toLowerCase()) ?? fallbackColor(language.name);

  let angle = 0;
  const slices = languages
    .map((language) => {
      const sweep = (language.percent / 100) * 2 * Math.PI;
      const start = angle;
      angle += sweep;
      const end = sweep >= 2 * Math.PI - 0.0001 ? start + 2 * Math.PI - 0.0001 : angle;
      return `<path d="${slicePath(centerY, start, end)}" fill="${colorOf(language)}"><title>${escapeXml(language.name)} ${language.percent.toFixed(2)}%</title></path>`;
    })
    .join("\n  ");

  const legend = languages
    .slice(0, LEGEND_ROWS)
    .map((language, index) => {
      const y = 96 + index * ROW_HEIGHT;
      const color = colorOf(language);
      const icon = icons.get(language.name.toLowerCase());
      const glyph = icon
        ? `<path transform="translate(33 ${y - 14}) scale(0.5833)" d="${icon.path}" fill="${readableOnDark(icon.hex)}"/>`
        : `<text x="40" y="${y}" font-size="9" font-weight="700" fill="${color}" text-anchor="middle">${escapeXml(language.name.slice(0, 2))}</text>`;
      const label = `${language.name} (${language.percent.toFixed(1)}%)`;
      const labelWidth = label.length * GLYPH_WIDTH;
      return `<rect x="30" y="${y - 17}" width="20" height="20" rx="4" fill="${TILE_FILL}"/>
  ${glyph}
  <rect x="58" y="${y - 17}" width="${labelWidth + 16}" height="22" rx="5" fill="${color}"/>
  <text x="66" y="${y}" font-size="15" font-weight="600" textLength="${labelWidth}" lengthAdjust="spacingAndGlyphs" fill="${textColorOn(color)}">${escapeXml(label)}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}" font-family="${FONT}">
  <rect width="${WIDTH}" height="${height}" fill="#1f2933"/>
  <text x="${WIDTH / 2}" y="34" font-size="19" fill="#4aa3df" text-anchor="middle">${escapeXml(title)}</text>
  <text x="${WIDTH / 2}" y="58" font-size="13" fill="#8a97a6" text-anchor="middle">${subtitle}</text>
  ${legend}
  ${slices}
</svg>
`;
};
