import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { renderDateChip } from "./renderDateChip.mjs";

/**
 * Renders recently active repositories as a Markdown list, each with a date
 * chip for its last push (linking to the repository's commits) and the primary language in small text.
 *
 * @param {{ name: string, url: string, description: string, language: string, pushedAt: string }[]} repos - Repositories, most recent first.
 * @returns {string} Markdown for the section body.
 */
export const renderRecentRepos = (repos) =>
  repos
    .map((repo) => {
      const description = repo.description ? `: ${escapeMarkdown(repo.description)}` : "";
      const dateChip = renderDateChip(repo.pushedAt, "Updated");
      const chip = dateChip ? `[${dateChip}](${repo.url}/commits)` : "";
      const language = repo.language ? ` <sub>${escapeMarkdown(repo.language)}</sub>` : "";
      return `- [**${escapeMarkdown(repo.name)}**](${repo.url})${description} ${chip}${language}`.trimEnd();
    })
    .join("\n");
