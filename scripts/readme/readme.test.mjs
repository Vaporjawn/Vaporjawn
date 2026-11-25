import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { fetchBlogPosts } from "./fetchBlogPosts.mjs";
import { fetchRecentRepos } from "./fetchRecentRepos.mjs";
import { fetchTopArtists } from "./fetchTopArtists.mjs";
import { parseRssItems } from "./parseRssItems.mjs";
import { renderBlogPosts } from "./renderBlogPosts.mjs";
import { renderRecentRepos } from "./renderRecentRepos.mjs";
import { renderTopArtists } from "./renderTopArtists.mjs";
import { replaceSection } from "./replaceSection.mjs";
import { updateReadme } from "./updateReadme.mjs";

/**
 * Builds a fake `fetch` that answers every request with the given body.
 *
 * @param {number} status - HTTP status to return.
 * @param {unknown} body - JSON value, or a string for text bodies.
 * @returns {typeof fetch} A stand-in fetch.
 */
const fakeFetch = (status, body) => async () =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

test("replaceSection swaps only the text between the markers", () => {
  const input = "a\n<!-- X:START -->\nold\n<!-- X:END -->\nb\n<!-- Y:START -->\nkeep\n<!-- Y:END -->";
  const output = replaceSection(input, "X", "new");
  assert.equal(output, "a\n<!-- X:START -->\nnew\n<!-- X:END -->\nb\n<!-- Y:START -->\nkeep\n<!-- Y:END -->");
});

test("replaceSection throws when a marker is missing or out of order", () => {
  assert.throws(() => replaceSection("no markers", "X", "n"), /missing the X markers/);
  assert.throws(() => replaceSection("<!-- X:END -->\n<!-- X:START -->", "X", "n"), /missing the X markers/);
});

test("escapeMarkdown neutralises Markdown, HTML and newlines", () => {
  assert.equal(escapeMarkdown("a *b* [c](d)\n<img src=x>"), "a \\*b\\* \\[c\\]\\(d\\) \\<img src=x\\>");
});

test("fetchTopArtists maps the Last.fm response and rejects API errors", async () => {
  const ok = fakeFetch(200, { topartists: { artist: [{ name: "Future", url: "https://www.last.fm/music/Future", playcount: "207" }] } });
  assert.deepEqual(await fetchTopArtists("k", "u", 5, ok), [
    { name: "Future", url: "https://www.last.fm/music/Future", playCount: 207 },
  ]);
  await assert.rejects(fetchTopArtists("k", "u", 5, fakeFetch(200, { error: 10, message: "Invalid API key" })), /Last\.fm error 10/);
  await assert.rejects(fetchTopArtists("k", "u", 5, fakeFetch(200, { nope: 1 })), /no topartists/);
  await assert.rejects(fetchTopArtists("k", "u", 5, fakeFetch(500, {})), /HTTP 500/);
});

test("renderTopArtists numbers artists and handles an empty month", () => {
  const text = renderTopArtists([{ name: "A_B", url: "https://x/y", playCount: 1234 }]);
  assert.match(text, /^1\. \[\*\*A\\_B\*\*\]\(https:\/\/x\/y\): 1,234 plays/);
  assert.equal(renderTopArtists([]), "_No scrobbles in the past 30 days._");
});

test("parseRssItems reads CDATA and plain values and honours the limit", () => {
  const xml = `<rss><channel>
    <item><title><![CDATA[First & best]]></title><link>https://a/1</link><pubDate>Mon, 10 Aug 2026 00:00:00 GMT</pubDate></item>
    <item><title>Second</title><link>https://a/2</link></item>
    <item><title>Bad link</title><link>javascript:alert(1)</link></item>
  </channel></rss>`;
  const items = parseRssItems(xml, 5);
  assert.deepEqual(items.map((item) => item.title), ["First & best", "Second"]);
  assert.equal(items[0].publishedAt.toISOString().slice(0, 10), "2026-08-10");
  assert.equal(items[1].publishedAt, null);
  assert.equal(parseRssItems(xml, 1).length, 1);
});

test("fetchBlogPosts rejects an empty feed and a failed request", async () => {
  await assert.rejects(fetchBlogPosts("https://x", 5, fakeFetch(200, "<rss></rss>")), /no posts/);
  await assert.rejects(fetchBlogPosts("https://x", 5, fakeFetch(404, "")), /HTTP 404/);
});

test("renderBlogPosts lists posts with dates", () => {
  const text = renderBlogPosts([{ title: "T", link: "https://a/1", publishedAt: new Date("2026-08-10T00:00:00Z") }]);
  assert.match(text, /^- \[T\]\(https:\/\/a\/1\) \(2026-08-10\)/);
});

test("fetchRecentRepos skips forks, archived repos and the profile repo", async () => {
  const repos = [
    { name: "Vaporjawn", fork: false, archived: false, private: false, html_url: "u0", pushed_at: "2026-11-01T00:00:00Z" },
    { name: "forked", fork: true, archived: false, private: false, html_url: "u1", pushed_at: "2026-11-01T00:00:00Z" },
    { name: "old", fork: false, archived: true, private: false, html_url: "u2", pushed_at: "2026-11-01T00:00:00Z" },
    { name: "keep", fork: false, archived: false, private: false, html_url: "u3", pushed_at: "2026-11-02T10:00:00Z", language: "TypeScript", description: null },
  ];
  assert.deepEqual(await fetchRecentRepos("Vaporjawn", 5, undefined, fakeFetch(200, repos)), [
    { name: "keep", url: "u3", description: "", language: "TypeScript", pushedAt: "2026-11-02" },
  ]);
});

test("renderRecentRepos formats description and language", () => {
  const text = renderRecentRepos([{ name: "r", url: "u", description: "d", language: "Rust", pushedAt: "2026-11-02" }]);
  assert.equal(text, "- [**r**](u): d <sub>(updated 2026-11-02, Rust)</sub>");
});

test("updateReadme isolates failures, skips keyless sections and never leaks the key", async () => {
  const dir = await mkdtemp(join(tmpdir(), "readme-test-"));
  const readmePath = join(dir, "README.md");
  const sections = ["RECENT_REPOS", "BLOG_POSTS", "TOP_ARTISTS"]
    .map((name) => `<!-- ${name}:START -->\nold ${name}\n<!-- ${name}:END -->`)
    .join("\n");
  try {
    await writeFile(readmePath, sections);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes("api.github.com")) {
        return new Response(JSON.stringify([{ name: "r", fork: false, archived: false, private: false, html_url: "u", pushed_at: "2026-11-02T00:00:00Z" }]));
      }
      return new Response("", { status: 503 });
    };
    try {
      const result = await updateReadme({ readmePath, githubUser: "Vaporjawn", lastfmUser: "Vaporjawn", feedUrl: "https://x/rss.xml", lastfmApiKey: "SECRETKEY123" });
      assert.equal(result.changed, true);
      assert.equal(result.failures.length, 2);
      assert.ok(result.failures.every((failure) => !failure.includes("SECRETKEY123")));
      const text = await readFile(readmePath, "utf8");
      assert.match(text, /\[\*\*r\*\*\]\(u\)/);
      assert.match(text, /old BLOG_POSTS/);
      assert.match(text, /old TOP_ARTISTS/);

      const keyless = await updateReadme({ readmePath, githubUser: "Vaporjawn", lastfmUser: "Vaporjawn", feedUrl: "https://x/rss.xml" });
      assert.deepEqual(keyless.skipped, ["TOP_ARTISTS (no API key)"]);
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    await rm(dir, { recursive: true });
  }
});
