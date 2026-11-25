/**
 * Replaces the text between `<!-- NAME:START -->` and `<!-- NAME:END -->`
 * markers in a Markdown document, leaving the markers themselves in place.
 *
 * @param {string} markdown - The full document text.
 * @param {string} name - The section name used in the marker comments.
 * @param {string} body - The new text to place between the markers.
 * @returns {string} The document with the section replaced.
 * @throws {Error} When either marker is missing or they appear out of order.
 */
export const replaceSection = (markdown, name, body) => {
  const startMarker = `<!-- ${name}:START -->`;
  const endMarker = `<!-- ${name}:END -->`;
  const startIndex = markdown.indexOf(startMarker);
  const endIndex = markdown.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`README is missing the ${name} markers (${startMarker} ... ${endMarker}).`);
  }

  const before = markdown.slice(0, startIndex + startMarker.length);
  const after = markdown.slice(endIndex);
  return `${before}\n${body.trim()}\n${after}`;
};
