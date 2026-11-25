import { formatDay } from "./formatDay.mjs";

/**
 * Formats a date range for a streak card. The year is shown only when the
 * range does not fall inside the current year, and an end date equal to
 * `presentIso` is shown as "Present" when `endIsPresent` is true.
 *
 * @param {string | null} start - Range start as `YYYY-MM-DD`.
 * @param {string | null} end - Range end as `YYYY-MM-DD`.
 * @param {string} today - Today as `YYYY-MM-DD`.
 * @param {boolean} endIsPresent - Show "Present" instead of the end date.
 * @returns {string} The text, or a dash when there is no range.
 */
export const formatDateRange = (start, end, today, endIsPresent) => {
  if (!start || !end) {
    return "-";
  }
  const sameYear = start.slice(0, 4) === today.slice(0, 4) && end.slice(0, 4) === today.slice(0, 4);
  const startText = formatDay(start, !sameYear);
  const endText = endIsPresent ? "Present" : formatDay(end, !sameYear);
  return `${startText} - ${endText}`;
};
