import { escapeMarkdown } from "./escapeMarkdown.mjs";

/**
 * Renders recently active repositories as a Markdown list.
 *
 * @param {{ name: string, url: string, description: string, language: string, pushedAt: string }[]} repos - Repositories, most recent first.
 * @returns {string} Markdown for the section body.
 */
export const renderRecentRepos = (repos) =>
  repos
    .map((repo) => {
      const description = repo.description ? `: ${escapeMarkdown(repo.description)}` : "";
      const language = repo.language ? `, ${escapeMarkdown(repo.language)}` : "";
      return `- [**${escapeMarkdown(repo.name)}**](${repo.url})${description} <sub>(updated ${repo.pushedAt}${language})</sub>`;
    })
    .join("\n");
