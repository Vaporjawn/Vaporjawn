const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a `YYYY-MM-DD` date as "Nov 6" or, with the year, "Nov 6, 2015".
 *
 * @param {string} isoDate - The date as `YYYY-MM-DD`.
 * @param {boolean} withYear - Whether to append the year.
 * @returns {string} The formatted date.
 */
export const formatDay = (isoDate, withYear) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}${withYear ? `, ${year}` : ""}`;
};
