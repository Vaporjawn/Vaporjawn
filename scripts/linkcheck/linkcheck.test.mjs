import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkLinks } from "./checkLinks.mjs";
import { checkUrl } from "./checkUrl.mjs";
import { classifyResponse } from "./classifyResponse.mjs";
import { extractLinks } from "./extractLinks.mjs";
import { formatIssueBody } from "./formatIssueBody.mjs";
import { loadSinglePageUrls } from "./loadSinglePageUrls.mjs";
import { runPool } from "./runPool.mjs";
import { syncIssue } from "./syncIssue.mjs";

const noSleep = async () => {};
const answer = (status, type = "text/html") => async () => new Response("", { status, headers: { "content-type": type } });

test("extractLinks finds Markdown and HTML addresses, nested badge links, and skips comments, anchors and mail", () => {
  const markdown = `
[plain](https://a.test/x) ![img](https://b.test/i.svg?q=1&amp;z=2 "title")
[![badge](https://c.test/badge.svg)](https://d.test/target)
<a href="https://e.test/page"><img src="./assets/local.svg?v=abc" alt="x"></a>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://f.test/dark.svg 2x"><img src="https://f.test/light.svg"></picture>
<!-- [hidden](https://hidden.test) -->
[anchor](#top) [mail](mailto:me@x.test) [dup](https://a.test/x)
`;
  const found = extractLinks(markdown).map((item) => `${item.kind} ${item.url}${item.isLocal ? " (local)" : ""}`);
  assert.deepEqual(found.sort(), [
    "image ./assets/local.svg?v=abc (local)",
    "image https://b.test/i.svg?q=1&z=2",
    "image https://c.test/badge.svg",
    "image https://f.test/dark.svg",
    "image https://f.test/light.svg",
    "link https://a.test/x",
    "link https://d.test/target",
    "link https://e.test/page",
  ]);
});

test("classifyResponse separates healthy, unverifiable and broken answers", () => {
  assert.equal(classifyResponse(200, "text/html", "link").verdict, "ok");
  assert.equal(classifyResponse(200, "image/svg+xml", "image").verdict, "ok");
  assert.equal(classifyResponse(200, "text/html", "image").verdict, "broken");
  assert.equal(classifyResponse(200, "", "image").verdict, "broken");
  for (const status of [401, 403, 405, 406, 429, 999]) assert.equal(classifyResponse(status, "", "link").verdict, "blocked");
  for (const status of [402, 404, 410, 418, 500, 503]) assert.equal(classifyResponse(status, "", "link").verdict, "broken");
});

test("checkUrl retries server errors and failures, but not a plain 404", async () => {
  let calls = 0;
  const flaky = async () => { calls += 1; return calls < 3 ? new Response("", { status: 503 }) : new Response("", { status: 200, headers: { "content-type": "text/html" } }); };
  const recovered = await checkUrl({ url: "https://x.test", kind: "link" }, { fetchImplementation: flaky, sleep: noSleep });
  assert.equal(recovered.verdict, "ok");
  assert.equal(calls, 3);

  let notFoundCalls = 0;
  const gone = async () => { notFoundCalls += 1; return new Response("", { status: 404 }); };
  assert.equal((await checkUrl({ url: "https://x.test", kind: "link" }, { fetchImplementation: gone, sleep: noSleep })).verdict, "broken");
  assert.equal(notFoundCalls, 1);

  let downCalls = 0;
  const down = async () => { downCalls += 1; throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }); };
  const result = await checkUrl({ url: "https://x.test", kind: "link" }, { fetchImplementation: down, sleep: noSleep });
  assert.equal(result.verdict, "broken");
  assert.match(result.detail, /ENOTFOUND/);
  assert.equal(downCalls, 3);
});

test("checkUrl accepts a 404 only for pages a single-page-app site is known to serve", async () => {
  const known = new Set(["https://site.test/resume"]);
  const listed = await checkUrl({ url: "https://site.test/resume?x=1", kind: "link" }, { fetchImplementation: answer(404), sleep: noSleep, knownSinglePageUrls: known });
  assert.equal(listed.verdict, "ok");
  const unlisted = await checkUrl({ url: "https://site.test/missing", kind: "link" }, { fetchImplementation: answer(404), sleep: noSleep, knownSinglePageUrls: known });
  assert.equal(unlisted.verdict, "broken");
});

test("loadSinglePageUrls reads the sitemap and the feed and survives a missing one", async () => {
  const route = async (url) => String(url).endsWith("/sitemap.xml")
    ? new Response("<urlset><url><loc>https://s.test/about</loc></url></urlset>")
    : String(url).endsWith("/rss.xml") ? new Response("<rss><item><link>https://s.test/blog/post/</link></item></rss>") : new Response("", { status: 404 });
  const known = await loadSinglePageUrls("https://s.test", route);
  assert.deepEqual([...known].sort(), ["https://s.test", "https://s.test/about", "https://s.test/blog/post"]);
  assert.deepEqual([...(await loadSinglePageUrls("https://s.test", async () => { throw new Error("offline"); }))], ["https://s.test"]);
});

test("runPool keeps result order and never exceeds the concurrency limit", async () => {
  let running = 0;
  let peak = 0;
  const results = await runPool([5, 1, 4, 2, 3, 0], 2, async (item) => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, item));
    running -= 1;
    return item * 10;
  });
  assert.deepEqual(results, [50, 10, 40, 20, 30, 0]);
  assert.ok(peak <= 2);
});

test("checkLinks checks local files against the repository and web addresses over the network", async () => {
  const root = await mkdtemp(join(tmpdir(), "linkcheck-"));
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "assets", "here.svg"), "<svg/>");
    const markdown = '<img src="./assets/here.svg?v=1"> <img src="./assets/gone.svg"> [web](https://ok.test) [dead](https://dead.test/page)';
    const route = async (url) => String(url).includes("dead.test") ? new Response("", { status: 404 }) : new Response("", { status: 200, headers: { "content-type": "text/html" } });
    const results = await checkLinks({ markdown, repoRoot: root }, { fetchImplementation: route, sleep: noSleep });
    const verdicts = Object.fromEntries(results.map((result) => [result.url, result.verdict]));
    assert.deepEqual(verdicts, { "./assets/here.svg?v=1": "ok", "./assets/gone.svg": "broken", "https://ok.test": "ok", "https://dead.test/page": "broken" });
  } finally {
    await rm(root, { recursive: true });
  }
});

test("formatIssueBody lists only broken addresses and counts unverifiable ones", () => {
  const body = formatIssueBody(
    [
      { url: "https://a.test", kind: "image", verdict: "broken", detail: "HTTP 402" },
      { url: "https://b.test", kind: "link", verdict: "blocked", detail: "HTTP 403" },
      { url: "https://c.test", kind: "link", verdict: "ok", detail: "HTTP 200" },
    ],
    "https://github.com/o/r/actions/runs/1",
  );
  assert.match(body, /found 1 broken address out of 3/);
  assert.match(body, /Image <https:\/\/a\.test>: HTTP 402/);
  assert.doesNotMatch(body, /c\.test/);
  assert.match(body, /1 other address was not verifiable/);
  assert.match(body, /actions\/runs\/1/);
});

/**
 * A fake GitHub issues API that records every call.
 *
 * @param {{ open: unknown[] }} state - The open issues the listing returns.
 * @returns {{ fetchImplementation: typeof fetch, calls: string[] }} The fake and its call log.
 */
const fakeIssues = (state) => {
  const calls = [];
  const fetchImplementation = async (url, init) => {
    const path = String(url).replace("https://api.github.com/repos/o/r", "");
    calls.push(`${init.method} ${path}`);
    return new Response(JSON.stringify(init.method === "GET" ? state.open : {}));
  };
  return { fetchImplementation, calls };
};
const broken = [{ url: "https://a.test", kind: "link", verdict: "broken", detail: "HTTP 404" }];
const healthy = [{ url: "https://a.test", kind: "link", verdict: "ok", detail: "HTTP 200" }];

test("syncIssue opens, updates and closes one tracking issue as the results change", async () => {
  const base = { repository: "o/r", token: "t", runUrl: "" };
  const opened = fakeIssues({ open: [] });
  assert.equal(await syncIssue({ ...base, results: broken }, opened.fetchImplementation), "opened");
  assert.deepEqual(opened.calls, ["GET /issues?labels=readme-link-check&state=open&per_page=1", "POST /issues"]);

  const updated = fakeIssues({ open: [{ number: 9 }] });
  assert.equal(await syncIssue({ ...base, results: broken }, updated.fetchImplementation), "updated");
  assert.deepEqual(updated.calls.slice(1), ["PATCH /issues/9"]);

  const closed = fakeIssues({ open: [{ number: 9 }] });
  assert.equal(await syncIssue({ ...base, results: healthy }, closed.fetchImplementation), "closed");
  assert.deepEqual(closed.calls.slice(1), ["POST /issues/9/comments", "PATCH /issues/9"]);

  const quiet = fakeIssues({ open: [] });
  assert.equal(await syncIssue({ ...base, results: healthy }, quiet.fetchImplementation), "none");
  assert.equal(quiet.calls.length, 1);
});

test("syncIssue fails loudly when GitHub refuses", async () => {
  await assert.rejects(syncIssue({ repository: "o/r", token: "t", runUrl: "", results: broken }, async () => new Response("", { status: 403 })), /HTTP 403/);
});
