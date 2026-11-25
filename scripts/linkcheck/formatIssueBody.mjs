/**
 * Writes the body of the "README links are broken" issue.
 *
 * @param {{ url: string, kind: string, verdict: string, detail: string }[]} results - All check results.
 * @param {string} runUrl - Address of the workflow run that produced them (may be empty).
 * @returns {string} Markdown for the issue body.
 */
export const formatIssueBody = (results, runUrl) => {
  const broken = results.filter((result) => result.verdict === "broken");
  const blocked = results.filter((result) => result.verdict === "blocked").length;
  const rows = broken.map((result) => `- ${result.kind === "image" ? "Image" : "Link"} <${result.url}>: ${result.detail}`);
  return [
    `The weekly README check found ${broken.length} broken ${broken.length === 1 ? "address" : "addresses"} out of ${results.length} checked.`,
    "",
    ...rows,
    "",
    `${blocked} other ${blocked === 1 ? "address was" : "addresses were"} not verifiable because the site refuses automated requests.`,
    runUrl ? `\nWorkflow run: ${runUrl}` : "",
    "\nThis issue closes itself when a later check finds everything healthy.",
  ].join("\n");
};
