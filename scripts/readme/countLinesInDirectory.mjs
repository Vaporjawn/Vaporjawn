import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { languageForFile } from "./languageForFile.mjs";

const SKIPPED_FOLDERS = new Set([".git", "node_modules", "vendor", "dist", "build", "Pods", "target", ".build", "DerivedData"]);
const MAX_FILE_BYTES = 1_000_000;

/**
 * Counts the non-blank lines of code per language in a folder, skipping
 * dependency and build folders, binary files, and files over 1 MB (which are
 * almost always generated or bundled).
 *
 * @param {string} directory - The folder to scan.
 * @returns {Promise<Map<string, number>>} Language name to non-blank line count.
 */
export const countLinesInDirectory = async (directory) => {
  const totals = new Map();
  const walk = async (folder) => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_FOLDERS.has(entry.name)) await walk(path);
        continue;
      }
      const language = entry.isFile() ? languageForFile(entry.name) : null;
      if (!language || (await stat(path)).size > MAX_FILE_BYTES) continue;
      const text = await readFile(path, "utf8");
      if (text.includes("\u0000")) continue;
      const lines = text.split("\n").filter((line) => line.trim() !== "").length;
      totals.set(language, (totals.get(language) ?? 0) + lines);
    }
  };
  await walk(directory);
  return totals;
};
