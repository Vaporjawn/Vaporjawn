import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { escapeXml } from "./escapeXml.mjs";
import { formatHours } from "./formatHours.mjs";

/**
 * Renders the Steam section: the games grid image (linked to the Steam
 * profile) with descriptive alt text, plus a collapsible list with a store
 * link per game.
 *
 * @param {{ appId: number, name: string, hoursLastTwoWeeks: number, hoursTotal: number }[]} games - Games, best first.
 * @param {string} imagePath - Repository-relative path of the grid SVG, already versioned.
 * @param {string} profileUrl - The Steam profile address.
 * @returns {string} Markdown for the section body.
 */
export const renderSteamSection = (games, imagePath, profileUrl) => {
  const alt = `Steam games: ${games
    .map((game) => `${game.name}, ${formatHours(game.hoursTotal)} hours on record${game.hoursLastTwoWeeks > 0 ? `, ${formatHours(game.hoursLastTwoWeeks)} in the last 2 weeks` : ""}`)
    .join("; ")}`;
  const list = games
    .map(
      (game, index) =>
        `${index + 1}. [**${escapeMarkdown(game.name)}**](https://store.steampowered.com/app/${game.appId}): ${formatHours(game.hoursTotal)} hrs on record${game.hoursLastTwoWeeks > 0 ? `, ${formatHours(game.hoursLastTwoWeeks)} hrs in the last 2 weeks` : ""}`,
    )
    .join("\n");
  return `<a href="${profileUrl}"><img src="${imagePath}" alt="${escapeXml(alt)}" width="100%"></a>

<details>
<summary>Game list (from <a href="${profileUrl}">Steam</a>)</summary>

${list}

</details>`;
};
