import { escapeMarkdown } from "./escapeMarkdown.mjs";

/**
 * Renders the most-played-artists list as a numbered Markdown list.
 *
 * @param {{ name: string, url: string, playCount: number }[]} artists - Artists, most played first.
 * @returns {string} Markdown for the section body.
 */
export const renderTopArtists = (artists) => {
  if (artists.length === 0) {
    return "_No scrobbles in the past 30 days._";
  }
  const lines = artists.map(
    (artist, index) =>
      `${index + 1}. [**${escapeMarkdown(artist.name)}**](${artist.url}): ${artist.playCount.toLocaleString("en-US")} plays`,
  );
  return `${lines.join("\n")}\n\n<sub>Most played artists over the past 30 days, from [Last.fm](https://www.last.fm/user/Vaporjawn).</sub>`;
};
