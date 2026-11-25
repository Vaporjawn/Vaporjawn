import { CARD_STYLE } from "./cardStyle.mjs";
import { escapeXml } from "./escapeXml.mjs";
import { formatDateRange } from "./formatDateRange.mjs";
import { renderOcticon } from "./renderOcticon.mjs";

const RING_RADIUS = 40;

/**
 * Draws the contribution streak card: total contributions, the current streak
 * inside a ring with a flame, and the longest streak, each with its dates.
 *
 * @param {ReturnType<import("./calculateStreaks.mjs").calculateStreaks>} streaks - Totals and streaks.
 * @param {string} today - Today as `YYYY-MM-DD`.
 * @returns {string} The SVG document text.
 */
export const renderStreakCardSvg = (streaks, today) => {
  const format = (number) => Number(number).toLocaleString("en-US");
  const total = formatDateRange(streaks.firstDate, today, today, true);
  const current = formatDateRange(streaks.current.start, streaks.current.end, today, false);
  const longest = formatDateRange(streaks.longest.start, streaks.longest.end, today, false);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" role="img" aria-label="${escapeXml(`GitHub contribution streak: ${format(streaks.total)} total, ${streaks.current.length} day current streak, ${streaks.longest.length} day longest streak`)}">
  <style>${CARD_STYLE}
    .big { fill: var(--accent); font-size: 28px; font-weight: 700; }
    .fire { fill: var(--fire); }
    .firebig { fill: var(--fire); font-size: 30px; font-weight: 700; }
    .caption { fill: var(--text); font-size: 14px; font-weight: 600; }
    .firecaption { fill: var(--fire); font-size: 14px; font-weight: 600; }
  </style>
  <rect class="card" x="0.5" y="0.5" width="494" height="194" rx="8"/>
  <line class="divider" x1="165" y1="30" x2="165" y2="165"/>
  <line class="divider" x1="330" y1="30" x2="330" y2="165"/>

  <text class="big" x="82.5" y="92" text-anchor="middle">${format(streaks.total)}</text>
  <text class="caption" x="82.5" y="122" text-anchor="middle">Total Contributions</text>
  <text class="muted" x="82.5" y="146" text-anchor="middle">${escapeXml(total)}</text>

  <circle class="track" cx="247.5" cy="84" r="${RING_RADIUS}" stroke-width="5" style="stroke: var(--fire); opacity: 0.9"/>
  ${renderOcticon("flame", 239.5, 36, 1, "fire")}
  <text class="firebig" x="247.5" y="94" text-anchor="middle">${format(streaks.current.length)}</text>
  <text class="firecaption" x="247.5" y="146" text-anchor="middle">Current Streak</text>
  <text class="muted" x="247.5" y="166" text-anchor="middle">${escapeXml(current)}</text>

  <text class="big" x="412.5" y="92" text-anchor="middle">${format(streaks.longest.length)}</text>
  <text class="caption" x="412.5" y="122" text-anchor="middle">Longest Streak</text>
  <text class="muted" x="412.5" y="146" text-anchor="middle">${escapeXml(longest)}</text>
</svg>
`;
};
