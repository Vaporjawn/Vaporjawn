import { CARD_STYLE } from "./cardStyle.mjs";
import { escapeXml } from "./escapeXml.mjs";
import { renderOcticon } from "./renderOcticon.mjs";

const RING_RADIUS = 40;

/**
 * Draws the "GitHub Stats" card: five public numbers on the left and, on the
 * right, a ring showing how many of the last 365 days had a contribution.
 *
 * @param {{ name: string, stars: number, lastYearContributions: number, pullRequests: number, issues: number, publicRepos: number, activeDayPercent: number }} stats - The numbers and the display name.
 * @returns {string} The SVG document text.
 */
export const renderStatsCardSvg = (stats) => {
  const rows = [
    ["star", "Total Stars Earned", stats.stars],
    ["activity", "Contributions (last year)", stats.lastYearContributions],
    ["pullRequest", "Pull Requests", stats.pullRequests],
    ["issue", "Issues", stats.issues],
    ["repo", "Public Repositories", stats.publicRepos],
  ];
  const rowMarkup = rows
    .map(([icon, label, value], index) => {
      const y = 72 + index * 25;
      return `${renderOcticon(icon, 25, y - 13, 1, "icon")}
  <text class="label" x="52" y="${y}">${escapeXml(label)}:</text>
  <text class="value" x="262" y="${y}">${Number(value).toLocaleString("en-US")}</text>`;
    })
    .join("\n  ");

  const circumference = 2 * Math.PI * RING_RADIUS;
  const percent = Math.max(0, Math.min(100, Math.round(stats.activeDayPercent)));
  const filled = (percent / 100) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" role="img" aria-label="${escapeXml(`${stats.name}'s GitHub stats`)}">
  <style>${CARD_STYLE}</style>
  <rect class="card" x="0.5" y="0.5" width="494" height="194" rx="8"/>
  <text class="title" x="25" y="36">${escapeXml(`${stats.name}'s GitHub Stats`)}</text>
  ${rowMarkup}
  <circle class="track" cx="410" cy="100" r="${RING_RADIUS}" stroke-width="9"/>
  <circle class="progress" cx="410" cy="100" r="${RING_RADIUS}" stroke-width="9" stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}" transform="rotate(-90 410 100)"/>
  <text class="value" x="410" y="105" text-anchor="middle" style="font-size: 22px">${percent}%</text>
  <text class="muted" x="410" y="162" text-anchor="middle">days active</text>
</svg>
`;
};
