/**
 * Finds every link and image address in a README: Markdown links and images,
 * HTML `<a href>`, `<img src>` and `<source srcset>`. HTML comments are
 * ignored, `mailto:` and in-page anchors are skipped, and each address is
 * listed once per kind.
 *
 * @param {string} markdown - The README text.
 * @returns {{ url: string, kind: "image" | "link", isLocal: boolean }[]} Addresses in order of first appearance; local ones are repository paths.
 */
export const extractLinks = (markdown) => {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, "");
  const found = [];
  const add = (rawUrl, kind) => {
    const url = rawUrl.trim().replaceAll("&amp;", "&");
    if (url === "" || url.startsWith("#") || /^(mailto|tel|javascript):/i.test(url)) {
      return;
    }
    found.push({ url, kind, isLocal: !/^https?:\/\//i.test(url) });
  };

  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) add(match[1], "image");
  for (const match of text.matchAll(/(?<!!)\[(?!!)[^\]]*\]\(([^)\s]+)[^)]*\)/g)) add(match[1], "link");
  for (const match of text.matchAll(/\)\]\(([^)\s]+)[^)]*\)/g)) add(match[1], "link");
  for (const match of text.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/gi)) add(match[1], "image");
  for (const match of text.matchAll(/<source\b[^>]*?\bsrcset="([^"\s]+)/gi)) add(match[1], "image");
  for (const match of text.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/gi)) add(match[1], "link");

  const seen = new Set();
  return found.filter((item) => {
    const key = `${item.kind} ${item.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
