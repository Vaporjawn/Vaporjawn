/**
 * Adds a number of days to a `YYYY-MM-DD` date, using UTC so daylight saving
 * time never shifts the result.
 *
 * @param {string} isoDate - The starting date as `YYYY-MM-DD`.
 * @param {number} deltaDays - Days to add (negative to subtract).
 * @returns {string} The new date as `YYYY-MM-DD`.
 */
export const shiftDate = (isoDate, deltaDays) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + deltaDays)).toISOString().slice(0, 10);
};
