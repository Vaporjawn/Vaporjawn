import { shiftDate } from "./shiftDate.mjs";

/**
 * Works out contribution totals and streaks from a daily calendar. Days after
 * `today` are ignored. A streak is a run of consecutive days with at least one
 * contribution; the current streak may end yesterday while today is still
 * empty, because the day is not over yet.
 *
 * @param {{ date: string, count: number }[]} days - Calendar days in ascending date order.
 * @param {string} today - Today as `YYYY-MM-DD`.
 * @returns {{ total: number, firstDate: string | null, current: { length: number, start: string | null, end: string | null }, longest: { length: number, start: string | null, end: string | null }, lastYear: { total: number, activeDays: number, dayCount: number } }} Totals and streaks.
 */
export const calculateStreaks = (days, today) => {
  const calendar = days.filter((day) => day.date <= today);
  const total = calendar.reduce((sum, day) => sum + day.count, 0);
  const firstDate = calendar.find((day) => day.count > 0)?.date ?? null;

  let longest = { length: 0, start: null, end: null };
  let runLength = 0;
  let runStart = null;
  for (const day of calendar) {
    if (day.count > 0) {
      if (runLength === 0) {
        runStart = day.date;
      }
      runLength += 1;
      if (runLength > longest.length) {
        longest = { length: runLength, start: runStart, end: day.date };
      }
    } else {
      runLength = 0;
    }
  }

  let index = calendar.length - 1;
  if (index >= 0 && calendar[index].count === 0 && calendar[index].date === today) {
    index -= 1;
  }
  let current = { length: 0, start: null, end: null };
  if (index >= 0 && calendar[index].count > 0) {
    const end = calendar[index].date;
    let length = 0;
    while (index >= 0 && calendar[index].count > 0) {
      length += 1;
      index -= 1;
    }
    current = { length, start: calendar[index + 1].date, end };
  }

  const windowStart = shiftDate(today, -364);
  const lastYearDays = calendar.filter((day) => day.date >= windowStart);
  return {
    total,
    firstDate,
    current,
    longest,
    lastYear: {
      total: lastYearDays.reduce((sum, day) => sum + day.count, 0),
      activeDays: lastYearDays.filter((day) => day.count > 0).length,
      dayCount: 365,
    },
  };
};
