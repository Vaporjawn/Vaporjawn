/**
 * Pulls the title, link and publish date out of each `<item>` in an RSS 2.0
 * feed. Handles plain and CDATA-wrapped values.
 *
 * @param {string} xml - The RSS document text.
 * @param {number} limit - The maximum number of items to return.
 * @returns {{ title: string, link: string, publishedAt: Date | null }[]} Items in feed order.
 */
export const parseRssItems = (xml, limit) => {
  const readTag = (itemXml, tag) => {
    const match = itemXml.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`));
    return match ? match[1].trim() : "";
  };

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, itemXml]) => {
      const published = new Date(readTag(itemXml, "pubDate"));
      return {
        title: readTag(itemXml, "title"),
        link: readTag(itemXml, "link"),
        publishedAt: Number.isNaN(published.getTime()) ? null : published,
      };
    })
    .filter((item) => item.title !== "" && item.link.startsWith("https://"))
    .slice(0, limit);
};
