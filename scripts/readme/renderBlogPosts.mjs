import { escapeMarkdown } from "./escapeMarkdown.mjs";

/**
 * Renders the latest blog posts as a Markdown list with publish dates.
 *
 * @param {{ title: string, link: string, publishedAt: Date | null }[]} posts - Posts, newest first.
 * @returns {string} Markdown for the section body.
 */
export const renderBlogPosts = (posts) => {
  const lines = posts.map((post) => {
    const date = post.publishedAt ? ` (${post.publishedAt.toISOString().slice(0, 10)})` : "";
    return `- [${escapeMarkdown(post.title)}](${post.link})${date}`;
  });
  return `${lines.join("\n")}\n\n[More posts on vaporjawn.dev](https://vaporjawn.dev/blog) · [RSS feed](https://vaporjawn.dev/rss.xml)`;
};
