import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Makes a shallow, single-commit copy of a public GitHub repository.
 *
 * @param {string} cloneUrl - The repository's HTTPS clone URL.
 * @param {string} destination - An empty folder to clone into.
 * @returns {Promise<void>}
 */
export const cloneRepository = async (cloneUrl, destination) => {
  await run("git", ["clone", "--depth", "1", "--quiet", cloneUrl, destination], { timeout: 300_000 });
};
