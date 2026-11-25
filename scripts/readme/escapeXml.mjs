/**
 * Escapes text for use inside SVG text nodes and HTML attribute values.
 *
 * @param {unknown} text - The raw text.
 * @returns {string} Text with `& < > " '` replaced by entities.
 */
export const escapeXml = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
