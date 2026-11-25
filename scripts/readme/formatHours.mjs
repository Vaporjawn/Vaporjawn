/**
 * Formats a playtime in hours: one decimal below 10 hours ("0.2"), otherwise
 * a whole number with thousands separators ("1,567").
 *
 * @param {number} hours - Playtime in hours.
 * @returns {string} The formatted number.
 */
export const formatHours = (hours) =>
  hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString("en-US");
