/**
 * Chooses which games to show: games played in the last two weeks first (most
 * played first), then the rest by total hours. Games with no name or no
 * playtime at all are left out.
 *
 * @param {{ appId: number, name: string, hoursLastTwoWeeks: number, hoursTotal: number }[]} games - Candidate games.
 * @param {number} limit - How many to keep.
 * @returns {{ appId: number, name: string, hoursLastTwoWeeks: number, hoursTotal: number }[]} The selection, best first.
 */
export const selectSteamGames = (games, limit) =>
  games
    .filter((game) => game.name !== "" && (game.hoursTotal > 0 || game.hoursLastTwoWeeks > 0))
    .sort((a, b) => b.hoursLastTwoWeeks - a.hoursLastTwoWeeks || b.hoursTotal - a.hoursTotal)
    .slice(0, limit);
