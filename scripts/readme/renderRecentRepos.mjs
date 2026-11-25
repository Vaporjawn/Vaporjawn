import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { renderDateChip } from "./renderDateChip.mjs";

/**
 * Renders recently active repositories as a Markdown list, each with a date
 * chip for its last push and the primary language in small text.
 *
 * @param {{ name: string, url: string, description: string, language: string, pushedAt: string }[]} repos - Repositories, most recent first.
 * @returns {string} Markdown for the section body.
 */
export const renderRecentRepos = (repos) =>
  repos
    .map((repo) => {
      const description = repo.description ? `: ${escapeMarkdown(repo.description)}` : "";
      const chip = renderDateChip(repo.pushedAt, "Updated");
      const language = repo.language ? ` <sub>${escapeMarkdown(repo.language)}</sub>` : "";
      return `- [**${escapeMarkdown(repo.name)}**](${repo.url})${description} ${chip}${language}`.trimEnd();
    })
    .join("\n");
