/**
 * Makes untrusted text (artist names, repo descriptions, post titles) safe to
 * put inside Markdown link text or a list item: collapses whitespace and
 * escapes characters that Markdown or inline HTML would interpret.
 *
 * @param {unknown} text - The raw value from an external API or feed.
 * @returns {string} Single-line text with Markdown and HTML characters escaped.
 */
export const escapeMarkdown = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\`*_{}[\]<>()#+!|~&]/g, (character) => `\\${character}`);
