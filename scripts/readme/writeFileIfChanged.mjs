import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Writes a text file only when its content differs, creating folders as
 * needed, so unchanged generated files cause no commit.
 *
 * @param {string} path - The file to write.
 * @param {string} text - The new content.
 * @returns {Promise<boolean>} True when the file was created or changed.
 */
export const writeFileIfChanged = async (path, text) => {
  const previous = await readFile(path, "utf8").catch(() => null);
  if (previous === text) {
    return false;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
  return true;
};
