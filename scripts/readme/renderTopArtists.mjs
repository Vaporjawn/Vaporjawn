import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { escapeXml } from "./escapeXml.mjs";

/**
 * Renders the most-played-artists section: the photo grid image (linked to
 * the Last.fm library page) with descriptive alt text, plus a collapsible
 * plain list with a link per artist for readers who prefer text.
 *
 * @param {{ name: string, url: string, playCount: number }[]} artists - Artists, most played first.
 * @param {string} imagePath - Repository-relative path of the grid SVG.
 * @returns {string} Markdown for the section body.
 */
export const renderTopArtists = (artists, imagePath) => {
  if (artists.length === 0) {
    return "_No scrobbles in the past 30 days._";
  }
  const alt = `Top artists over the last 30 days: ${artists
    .map((artist) => `${artist.name}, ${artist.playCount.toLocaleString("en-US")} plays`)
    .join("; ")}`;
  const list = artists
    .map(
      (artist, index) =>
        `${index + 1}. [**${escapeMarkdown(artist.name)}**](${artist.url}): ${artist.playCount.toLocaleString("en-US")} plays`,
    )
    .join("\n");
  return `<a href="https://www.last.fm/user/Vaporjawn/library/artists?date_preset=LAST_30_DAYS"><img src="${imagePath}" alt="${escapeXml(alt)}" width="100%"></a>

<details>
<summary>Artist list (from <a href="https://www.last.fm/user/Vaporjawn">Last.fm</a>)</summary>

${list}

</details>`;
};
