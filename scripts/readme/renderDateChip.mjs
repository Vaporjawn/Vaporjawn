const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Renders an ISO date (`YYYY-MM-DD`) as a compact Shields.io chip such as
 * "Nov 25, 2026", with alt text like "Updated Nov 25, 2026" for screen readers.
 *
 * @param {string} isoDate - The date, as `YYYY-MM-DD`.
 * @param {string} verb - Word placed before the date in the alt text, e.g. "Updated" or "Published".
 * @returns {string} Markdown for the chip, or an empty string when the date is not valid.
 */
export const renderDateChip = (isoDate, verb) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    return "";
  }
  const text = `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
  const badgeLabel = encodeURIComponent(text).replaceAll("-", "--").replaceAll("%20", "_");
  return `![${verb} ${text}](https://img.shields.io/badge/${badgeLabel}-30363d?style=flat-square)`;
};
