import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { renderDateChip } from "./renderDateChip.mjs";

/**
 * Renders the latest blog posts as a Markdown list, each with a date chip.
 *
 * @param {{ title: string, link: string, publishedAt: Date | null }[]} posts - Posts, newest first.
 * @returns {string} Markdown for the section body.
 */
export const renderBlogPosts = (posts) => {
  const lines = posts.map((post) => {
    const chip = post.publishedAt ? ` ${renderDateChip(post.publishedAt.toISOString().slice(0, 10), "Published")}` : "";
    return `- [${escapeMarkdown(post.title)}](${post.link})${chip}`;
  });
  return `${lines.join("\n")}\n\n[More posts on vaporjawn.dev](https://vaporjawn.dev/blog) · [RSS feed](https://vaporjawn.dev/rss.xml)`;
};
