import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Makes a shallow, single-commit copy of a GitHub repository. A token, when
 * given, is sent as a request header so it never appears in the clone URL or
 * in the saved `.git/config`.
 *
 * @param {string} cloneUrl - The repository's HTTPS clone URL.
 * @param {string} destination - An empty folder to clone into.
 * @param {string} [token] - A token that can read the repository (needed for private ones).
 * @returns {Promise<void>}
 */
export const cloneRepository = async (cloneUrl, destination, token) => {
  const auth = token ? ["-c", `http.extraHeader=Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`] : [];
  await run("git", [...auth, "clone", "--depth", "1", "--quiet", cloneUrl, destination], { timeout: 300_000 });
};
