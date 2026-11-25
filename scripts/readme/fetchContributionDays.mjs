import { fetchGraphql } from "./fetchGraphql.mjs";

/**
 * Reads a user's whole contribution calendar (one entry per day, from the year
 * the account was created to the end of the current year). GitHub limits a
 * contributions query to one year, so each year is fetched as an aliased
 * field of a single request.
 *
 * @param {string} user - The GitHub username.
 * @param {string} token - A GitHub token.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @param {Date} [now] - The current time, injectable for tests.
 * @returns {Promise<{ date: string, count: number }[]>} Days in ascending order, as `YYYY-MM-DD` and contribution count.
 */
export const fetchContributionDays = async (user, token, fetchImplementation = fetch, now = new Date()) => {
  const created = await fetchGraphql(
    "query($login: String!) { user(login: $login) { createdAt } }",
    { login: user },
    token,
    fetchImplementation,
  );
  const firstYear = new Date(created.user.createdAt).getUTCFullYear();
  const years = Array.from({ length: now.getUTCFullYear() - firstYear + 1 }, (_, index) => firstYear + index);

  const fields = years
    .map(
      (year) =>
        `y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") { contributionCalendar { weeks { contributionDays { date contributionCount } } } }`,
    )
    .join("\n");
  const data = await fetchGraphql(
    `query($login: String!) { user(login: $login) { ${fields} } }`,
    { login: user },
    token,
    fetchImplementation,
  );

  const counts = new Map();
  for (const year of years) {
    for (const week of data.user[`y${year}`].contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        counts.set(day.date, day.contributionCount);
      }
    }
  }
  return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, count]) => ({ date, count }));
};
