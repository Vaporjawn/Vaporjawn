import { formatIssueBody } from "./formatIssueBody.mjs";

const LABEL = "readme-link-check";
const TITLE = "README links or images are broken";

/**
 * Keeps one GitHub issue in step with the latest check: opens it (or updates
 * the open one) when something is broken, and closes it with a comment when
 * everything is healthy again.
 *
 * @param {{ results: { url: string, kind: string, verdict: string, detail: string }[], repository: string, token: string, runUrl: string }} options - Check results, `owner/repo`, token with issue access, and the run address.
 * @param {typeof fetch} [fetchImplementation] - Injectable fetch, for tests.
 * @returns {Promise<"opened" | "updated" | "closed" | "none">} What was done.
 */
export const syncIssue = async (options, fetchImplementation = fetch) => {
  const api = `https://api.github.com/repos/${options.repository}`;
  const call = async (path, method, body) => {
    const response = await fetchImplementation(`${api}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Vaporjawn-readme-link-check",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub issue request failed: ${method} ${path} returned HTTP ${response.status}.`);
    }
    return response.json();
  };

  const open = await call(`/issues?labels=${LABEL}&state=open&per_page=1`, "GET");
  const existing = open[0];
  const hasBroken = options.results.some((result) => result.verdict === "broken");

  if (hasBroken) {
    const body = formatIssueBody(options.results, options.runUrl);
    if (existing) {
      await call(`/issues/${existing.number}`, "PATCH", { body });
      return "updated";
    }
    await call("/issues", "POST", { title: TITLE, body, labels: [LABEL] });
    return "opened";
  }
  if (existing) {
    await call(`/issues/${existing.number}/comments`, "POST", { body: "A later check found every README link and image healthy again, so this issue is closed." });
    await call(`/issues/${existing.number}`, "PATCH", { state: "closed", state_reason: "completed" });
    return "closed";
  }
  return "none";
};
