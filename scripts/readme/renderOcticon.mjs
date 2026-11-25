import { OCTICON_PATHS } from "./octiconPaths.mjs";

/**
 * Draws one Octicon as SVG paths at a position, scaled from its 16px design size.
 *
 * @param {string} name - A key of the icon table, e.g. `star`.
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {number} scale - Size multiplier (1 = 16px).
 * @param {string} className - CSS class for the fill colour.
 * @returns {string} SVG markup for the icon.
 */
export const renderOcticon = (name, x, y, scale, className) =>
  OCTICON_PATHS[name]
    .map(
      (path) =>
        `<path class="${className}" transform="translate(${x} ${y}) scale(${scale})" d="${path.d}"${path.evenodd ? ' fill-rule="evenodd"' : ""}/>`,
    )
    .join("\n  ");
