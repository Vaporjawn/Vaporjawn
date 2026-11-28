import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { countLinesInDirectory } from "./countLinesInDirectory.mjs";
import { fetchLineCounts } from "./fetchLineCounts.mjs";
import { languageForFile } from "./languageForFile.mjs";
import { escapeMarkdown } from "./escapeMarkdown.mjs";
import { fetchArtistImage } from "./fetchArtistImage.mjs";
import { fetchLanguageIcons } from "./fetchLanguageIcons.mjs";
import { fetchLanguageColors } from "./fetchLanguageColors.mjs";
import { stampAssetVersion } from "./stampAssetVersion.mjs";
import { fetchBlogPosts } from "./fetchBlogPosts.mjs";
import { fetchRecentRepos } from "./fetchRecentRepos.mjs";
import { fetchTopArtists } from "./fetchTopArtists.mjs";
import { fetchTotalStars } from "./fetchTotalStars.mjs";
import { fetchWakatimeLanguages } from "./fetchWakatimeLanguages.mjs";
import { parseRssItems } from "./parseRssItems.mjs";
import { renderBlogPosts } from "./renderBlogPosts.mjs";
import { renderDateChip } from "./renderDateChip.mjs";
import { renderLanguageChartSvg } from "./renderLanguageChartSvg.mjs";
import { renderRecentRepos } from "./renderRecentRepos.mjs";
import { renderStarBadge } from "./renderStarBadge.mjs";
import { renderTopArtists } from "./renderTopArtists.mjs";
import { renderTopArtistsSvg } from "./renderTopArtistsSvg.mjs";
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

test("renderTopArtists links the grid image, escapes alt text and lists artists", () => {
  const text = renderTopArtists([{ name: 'A_B "x"', url: "https://x/y", playCount: 1234 }], "./assets/top-artists.svg");
  assert.match(text, /<img src="\.\/assets\/top-artists\.svg" alt="Top artists over the last 30 days: A_B &#34;x&#34;, 1,234 plays"/);
  assert.match(text, /1\. \[\*\*A\\_B "x"\*\*\]\(https:\/\/x\/y\): 1,234 plays/);
  assert.equal(renderTopArtists([], "./a.svg"), "_No scrobbles in the past 30 days._");
});

test("renderTopArtistsSvg draws a tile per artist, escapes names and falls back without a photo", () => {
  const svg = renderTopArtistsSvg([
    { name: "Future", playCount: 207, imageDataUri: "data:image/jpeg;base64,AAAA" },
    { name: "<script>&", playCount: 1, imageDataUri: null },
    { name: "A very long artist name that must be cut", playCount: 5, imageDataUri: null },
  ]);
  assert.equal((svg.match(/<image /g) ?? []).length, 1);
  assert.match(svg, /207 plays/);
  assert.match(svg, /1 play</);
  assert.match(svg, /&#60;script&#62;&#38;/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /A very long artist …|A very long artist n…|A very long artist na…/);
  assert.match(svg, /viewBox="0 0 1692 \d+"/);
  assert.ok(renderTopArtistsSvg([]).includes("Top Artists"));
});

test("renderLanguageChartSvg highlights each language label in its colour with readable text", () => {
  const svg = renderLanguageChartSvg(
    [{ name: "JavaScript", percent: 70 }, { name: "TypeScript", percent: 30 }],
    new Map([["javascript", "#f1e05a"], ["typescript", "#3178c6"]]),
    "x",
  );
  assert.match(svg, /<rect x="58" y="\d+" width="\d+" height="22" rx="5" fill="#f1e05a"\/>/);
  assert.match(svg, /fill="#10161d">JavaScript \(70\.0%\)<\/text>/);
  assert.match(svg, /fill="#ffffff">TypeScript \(30\.0%\)<\/text>/);
  assert.match(svg, /textLength="\d+" lengthAdjust="spacingAndGlyphs"/);
});

test("stampAssetVersion adds and refreshes a content-hash query on matching images only", () => {
  const once = stampAssetVersion('<img src="./a/x.svg"> <img src="./a/other.svg">', "./a/x.svg", "one");
  assert.match(once, /src="\.\/a\/x\.svg\?v=[0-9a-f]{8}"/);
  assert.match(once, /src="\.\/a\/other\.svg"/);
  const twice = stampAssetVersion(once, "./a/x.svg", "two");
  assert.notEqual(twice, once);
  assert.equal(stampAssetVersion(twice, "./a/x.svg", "two"), twice);
  assert.equal((twice.match(/\?v=/g) ?? []).length, 1);
});

test("fetchArtistImage accepts only an exact-name match with a small JPEG", async () => {
  const jpeg = Buffer.from("fakejpeg");
  const route = (search, imageHeaders = { "content-type": "image/jpeg" }, imageBody = jpeg) => async (url) =>
    String(url).includes("api.deezer.com")
      ? new Response(JSON.stringify({ data: search }))
      : new Response(imageBody, { headers: imageHeaders });
  const ok = [{ name: "Future", picture_big: "https://img/f.jpg" }];
  assert.equal(await fetchArtistImage("future", route(ok)), `data:image/jpeg;base64,${jpeg.toString("base64")}`);
  assert.equal(await fetchArtistImage("Future", route([{ name: "Drake", picture_big: "https://img/d.jpg" }])), null);
  assert.equal(await fetchArtistImage("Future", route(ok, { "content-type": "text/html" })), null);
  assert.equal(await fetchArtistImage("Future", route(ok, undefined, Buffer.alloc(300_000))), null);
  assert.equal(await fetchArtistImage("Future", async () => { throw new Error("offline"); }), null);
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
  assert.equal(text.split("\n")[0], "- [T](https://a/1) [![Published Aug 10, 2026](https://img.shields.io/badge/Aug_10%2C_2026-30363d?style=flat-square)](https://a/1)");
  assert.equal(renderBlogPosts([{ title: "N", link: "https://a/2", publishedAt: null }]).split("\n")[0], "- [N](https://a/2)");
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

test("renderDateChip formats compact dates and rejects invalid ones", () => {
  assert.equal(renderDateChip("2025-12-05", "Updated"), "![Updated Dec 5, 2025](https://img.shields.io/badge/Dec_5%2C_2025-30363d?style=flat-square)");
  for (const bad of ["", "2026-13-01", "2026-00-10", "yesterday", "2026-1-1"]) {
    assert.equal(renderDateChip(bad, "Updated"), "");
  }
});

test("renderRecentRepos formats description and language", () => {
  const text = renderRecentRepos([{ name: "r", url: "u", description: "d", language: "Rust", pushedAt: "2026-11-02" }]);
  assert.equal(text, "- [**r**](u): d [![Updated Nov 2, 2026](https://img.shields.io/badge/Nov_2%2C_2026-30363d?style=flat-square)](u/commits) <sub>Rust</sub>");
});

test("fetchTotalStars sums stars across pages and ignores forks", async () => {
  const fullPage = Array.from({ length: 100 }, () => ({ fork: false, stargazers_count: 1 }));
  let calls = 0;
  const paged = async () => new Response(JSON.stringify(calls++ === 0 ? fullPage : [{ fork: false, stargazers_count: 5 }, { fork: true, stargazers_count: 99 }]));
  assert.equal(await fetchTotalStars("u", undefined, paged), 105);
  await assert.rejects(fetchTotalStars("u", undefined, fakeFetch(200, { nope: 1 })), /unexpected/);
  assert.match(renderStarBadge(38, "Vaporjawn"), /^\[!\[Stars received: 38\]\(https:\/\/img\.shields\.io\/badge\/Stars%20Received-38-black\?style=for-the-badge\)\]\(https:\/\/github\.com\/Vaporjawn\?tab=repositories&sort=stargazers\)$/);
});

test("fetchWakatimeLanguages drops Other, rescales to 100 and sorts", async () => {
  const body = { data: { human_readable_range: "since Feb 28 2020", languages: [
    { name: "Other", percent: 50, ai_coding_seconds: "1", manual_coding_seconds: "0" },
    { name: "Markdown", percent: 10, ai_coding_seconds: "100", manual_coding_seconds: "20" },
    { name: "TypeScript", percent: 30, ai_coding_seconds: "300", manual_coding_seconds: "0" },
    { name: "other", percent: 5 },
  ] } };
  const result = await fetchWakatimeLanguages("u", fakeFetch(200, body));
  assert.deepEqual(result.languages.map((language) => language.name), ["TypeScript", "Markdown"]);
  assert.ok(Math.abs(result.languages.reduce((sum, language) => sum + language.percent, 0) - 100) < 1e-9);
  assert.equal(Math.round(result.languages[0].percent), 75);
  assert.equal(result.languages[1].seconds, 120);
  assert.equal(result.rangeText, "since Feb 28 2020");
  await assert.rejects(fetchWakatimeLanguages("u", fakeFetch(200, { data: { languages: [{ name: "Other", percent: 99 }] } })), /no languages besides Other/);
  await assert.rejects(fetchWakatimeLanguages("u", fakeFetch(200, { data: {} })), /no language stats/);
});

test("fetchLanguageColors keeps valid colours and survives an outage", async () => {
  const colors = await fetchLanguageColors(fakeFetch(200, { data: [{ name: "TypeScript", color: "#3178c6" }, { name: "Bad", color: "red" }] }));
  assert.deepEqual([...colors], [["typescript", "#3178c6"]]);
  assert.equal((await fetchLanguageColors(fakeFetch(500, {}))).size, 0);
});

test("renderLanguageChartSvg draws one slice per language, a capped legend, and never mentions Other as a slice", () => {
  const languages = Array.from({ length: 20 }, (_, index) => ({ name: `Lang${index}`, percent: 5 }));
  const svg = renderLanguageChartSvg(languages, new Map([["lang0", "#112233"]]), "since 2020");
  assert.equal((svg.match(/<path /g) ?? []).length, 20);
  assert.equal((svg.match(/<rect x="30"/g) ?? []).length, 16);
  assert.match(svg, /fill="#112233"/);
  assert.match(svg, /since 2020/);
  assert.match(svg, /Lang0 \(5\.0%\)/);
  assert.doesNotMatch(svg, /Other \(/);
  const single = renderLanguageChartSvg([{ name: "Solo", percent: 100 }], new Map(), "x");
  assert.equal((single.match(/<path /g) ?? []).length, 1);
});

test("fetchLanguageIcons maps names and aliases, skips unsafe or missing logos and survives outages", async () => {
  const catalog = [
    { title: "TypeScript", slug: "typescript", hex: "3178C6" },
    { title: "HTML5", slug: "html5", hex: "E34F26" },
    { title: "Evil", slug: "evil", hex: "000000" },
    { title: "BadHex", slug: "badhex", hex: "zzzzzz" },
  ];
  const route = async (url) => {
    const address = String(url);
    if (address.endsWith("simple-icons.json")) return new Response(JSON.stringify(catalog));
    if (address.endsWith("/typescript.svg")) return new Response('<svg><title>x</title><path d="M0 0L24 24z"/></svg>');
    if (address.endsWith("/html5.svg")) return new Response('<svg><path d="M1 1h2"/></svg>');
    if (address.endsWith("/evil.svg")) return new Response('<svg><path d="M0 0" onload="x"/></svg>'.replace('d="M0 0"', 'd="M0 0&quot;><script>"'));
    return new Response("", { status: 404 });
  };
  const icons = await fetchLanguageIcons(["TypeScript", "HTML", "Evil", "BadHex", "C#", "Nope"], route);
  assert.deepEqual([...icons.keys()].sort(), ["html", "typescript"]);
  assert.equal(icons.get("typescript").hex, "3178C6");
  assert.equal((await fetchLanguageIcons(["TypeScript"], fakeFetch(500, {}))).size, 0);
});

test("renderLanguageChartSvg draws logos for known languages and letter badges for the rest", () => {
  const svg = renderLanguageChartSvg(
    [{ name: "TypeScript", percent: 60 }, { name: "Markdown", percent: 30 }, { name: "C#", percent: 10 }],
    new Map(),
    "x",
    new Map([["typescript", { path: "M0 0L24 24z", hex: "3178C6" }], ["markdown", { path: "M1 1h2", hex: "000000" }]]),
  );
  assert.match(svg, /d="M0 0L24 24z" fill="#3178C6"/);
  assert.match(svg, /d="M1 1h2" fill="#d6dde6"/);
  assert.match(svg, />C#<\/text>/);
  assert.equal((svg.match(/<rect x="30" /g) ?? []).length, 3);
  assert.equal((svg.match(/<rect x="58" /g) ?? []).length, 3);
});

test("updateReadme isolates failures, skips keyless sections and never leaks the key", async () => {
  const dir = await mkdtemp(join(tmpdir(), "readme-test-"));
  const readmePath = join(dir, "README.md");
  const sections = ["STARS", "RECENT_REPOS", "BLOG_POSTS", "TOP_ARTISTS"]
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
      const result = await updateReadme({ readmePath, artistsSvgPath: join(dir, "a", "top.svg"), artistsSvgHref: "./a/top.svg", wakatimeSvgPath: join(dir, "a", "waka.svg"), wakatimeSvgHref: "./a/waka.svg", wakatimeUser: "Vaporjawn", githubUser: "Vaporjawn", lastfmUser: "Vaporjawn", feedUrl: "https://x/rss.xml", lastfmApiKey: "SECRETKEY123" });
      assert.equal(result.changed, true);
      assert.equal(result.failures.length, 4); // blog, artists, Steam and the WakaTime chart (503 stand-in)
      assert.ok(result.failures.every((failure) => !failure.includes("SECRETKEY123")));
      const text = await readFile(readmePath, "utf8");
      assert.match(text, /\[\*\*r\*\*\]\(u\)/);
      assert.match(text, /old BLOG_POSTS/);
      assert.match(text, /old TOP_ARTISTS/);

      const keyless = await updateReadme({ readmePath, artistsSvgPath: join(dir, "a", "top.svg"), artistsSvgHref: "./a/top.svg", wakatimeSvgPath: join(dir, "a", "waka.svg"), wakatimeSvgHref: "./a/waka.svg", wakatimeUser: "Vaporjawn", githubUser: "Vaporjawn", lastfmUser: "Vaporjawn", feedUrl: "https://x/rss.xml" });
      assert.deepEqual(keyless.skipped, ["GITHUB_CARDS (no GitHub token)", "TOP_ARTISTS (no API key)"]);
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("languageForFile names code files and ignores prose and data", () => {
  assert.equal(languageForFile("a/b.tsx"), "TypeScript");
  assert.equal(languageForFile("x.RS"), "Rust");
  for (const name of ["README.md", "package-lock.json", "logo.svg", "Makefile"]) assert.equal(languageForFile(name), null);
});

test("countLinesInDirectory counts non-blank lines per language and skips dependency folders, binaries and huge files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lines-test-"));
  try {
    await mkdir(join(dir, "src"));
    await mkdir(join(dir, "node_modules"));
    await writeFile(join(dir, "src", "a.ts"), "one\n\n  \ntwo\n");
    await writeFile(join(dir, "b.ts"), "three");
    await writeFile(join(dir, "node_modules", "dep.js"), "x\ny\n");
    await writeFile(join(dir, "bin.js"), "a\u0000b\nc");
    await writeFile(join(dir, "big.js"), "x\n".repeat(600_000));
    await writeFile(join(dir, "notes.md"), "words\n");
    assert.deepEqual([...(await countLinesInDirectory(dir))], [["TypeScript", 3]]);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("fetchLineCounts skips forks and excluded repos, includes private ones when a token is given, keeps private repos out of the public cache, reuses the cache for unchanged pushes, and keeps cache on clone failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lines-test-"));
  const cachePath = join(dir, "cache.json");
  const repo = (name, extra = {}) => ({ name, fork: false, archived: false, private: false, pushed_at: "t1", clone_url: `https://x/${name}.git`, ...extra });
  const listing = async () => new Response(JSON.stringify([repo("keep"), repo("same"), repo("broken", { private: true }), repo("curated"), repo("f", { fork: true }), repo("p", { private: true }), repo("huge", { size: 5_000_000 })]));
  const urls = [];
  const recording = async (url) => { urls.push(String(url)); return listing(); };
  const cloned = [];
  try {
    const privateCachePath = join(dir, "private.json");
    await writeFile(cachePath, JSON.stringify({ same: { pushedAt: "t1", counts: { Rust: 10 } } }));
    await writeFile(privateCachePath, JSON.stringify({ broken: { pushedAt: "old", counts: { Go: 5 } } }));
    const result = await fetchLineCounts("u", "TOKEN", cachePath, privateCachePath, {
      fetchImplementation: recording,
      excludedRepositories: ["curated"],
      clone: async (url, folder, token) => { cloned.push(`${url} ${token ?? "-"}`); if (url.includes("broken")) throw new Error("no"); },
      count: async () => new Map([["TypeScript", 30]]),
    });
    assert.deepEqual(cloned, ["https://x/keep.git -", "https://x/broken.git TOKEN", "https://x/p.git TOKEN"]);
    assert.ok(urls[0].includes("/user/repos?affiliation=owner&visibility=all"));
    assert.equal(result.repositoryCount, 4);
    assert.equal(result.totalLines, 75);
    assert.deepEqual(result.languages.map((language) => [language.name, language.lines]), [["TypeScript", 60], ["Rust", 10], ["Go", 5]]);
    assert.deepEqual(Object.keys(result.cache).sort(), ["keep", "same"]);
    assert.deepEqual(Object.keys(result.privateCache).sort(), ["broken", "p"]);
    await assert.rejects(fetchLineCounts("u", undefined, join(dir, "none.json"), undefined, { fetchImplementation: async () => new Response("[]") }), /No lines of code/);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("renderLanguageChartSvg accepts custom headings and escapes the title", () => {
  const svg = renderLanguageChartSvg([{ name: "Rust", percent: 100 }], new Map(), "", new Map(), { title: "A & B", subtitle: "sub", ariaLabel: "x<y" });
  assert.match(svg, />A &#38; B<\/text>/);
  assert.match(svg, />sub<\/text>/);
  assert.match(svg, /aria-label="x&#60;y"/);
  assert.ok(!svg.includes("wakatime.com"));
});

test("updateReadme skips the lines-of-code chart, without touching its files, when no private-capable token is set", async () => {
  const dir = await mkdtemp(join(tmpdir(), "readme-test-"));
  try {
    await writeFile(join(dir, "README.md"), "x");
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("", { status: 503 });
    try {
      const result = await updateReadme({ readmePath: join(dir, "README.md"), artistsSvgPath: join(dir, "t.svg"), artistsSvgHref: "./t.svg", wakatimeSvgPath: join(dir, "w.svg"), wakatimeSvgHref: "./w.svg", wakatimeUser: "u", githubUser: "u", lastfmUser: "u", feedUrl: "https://x/rss.xml", linesSvgPath: join(dir, "l.svg"), linesSvgHref: "./l.svg", linesCachePath: join(dir, "l.json") });
      assert.ok(result.skipped.includes("LINES_CHART (no token that can read private repositories)"));
      assert.ok(!result.failures.some((failure) => failure.startsWith("LINES_CHART")));
      await assert.rejects(readFile(join(dir, "l.svg")));
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    await rm(dir, { recursive: true });
  }
});
