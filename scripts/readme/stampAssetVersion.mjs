import { contentHash } from "./contentHash.mjs";

/**
 * Sets (or refreshes) a `?v=<hash>` suffix on every `src="<assetPath>"` in a
 * document, so the image URL changes exactly when the image's content does.
 *
 * @param {string} markdown - The document text.
 * @param {string} assetPath - The image path exactly as written in `src`, e.g. `./assets/chart.svg`.
 * @param {string} assetText - The image's current content, which the hash is taken from.
 * @returns {string} The document with the versioned URL.
 */
export const stampAssetVersion = (markdown, assetPath, assetText) => {
  const escapedPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(
    new RegExp(`src="${escapedPath}(?:\\?v=[0-9a-f]+)?"`, "g"),
    `src="${assetPath}?v=${contentHash(assetText)}"`,
  );
};
