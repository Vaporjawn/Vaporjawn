import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGithubCards } from "./buildGithubCards.mjs";
import { buildSteamGames } from "./buildSteamGames.mjs";
import { calculateStreaks } from "./calculateStreaks.mjs";
import { fetchContributionDays } from "./fetchContributionDays.mjs";
import { fetchGraphql } from "./fetchGraphql.mjs";
import { fetchImageDataUri } from "./fetchImageDataUri.mjs";
import { fetchOwnedGames } from "./fetchOwnedGames.mjs";
import { fetchProfileStats } from "./fetchProfileStats.mjs";
import { fetchSteamProfile } from "./fetchSteamProfile.mjs";
import { formatDateRange } from "./formatDateRange.mjs";
import { formatHours } from "./formatHours.mjs";
import { renderGithubCards } from "./renderGithubCards.mjs";
import { renderStatsCardSvg } from "./renderStatsCardSvg.mjs";
import { renderSteamSection } from "./renderSteamSection.mjs";
import { renderSteamSvg } from "./renderSteamSvg.mjs";
import { renderStreakCardSvg } from "./renderStreakCardSvg.mjs";
import { selectSteamGames } from "./selectSteamGames.mjs";
import { shiftDate } from "./shiftDate.mjs";

/**
 * Builds a calendar of consecutive days starting at a date.
 *
 * @param {string} start - First day, `YYYY-MM-DD`.
 * @param {number[]} counts - Contribution count for each consecutive day.
 * @returns {{ date: string, count: number }[]} The calendar.
 */
const calendar = (start, counts) => counts.map((count, index) => ({ date: shiftDate(start, index), count }));

test("shiftDate crosses month and year boundaries without daylight saving drift", () => {
  assert.equal(shiftDate("2026-03-08", 1), "2026-03-09");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2026-02-28", 1), "2026-03-01");
  assert.equal(shiftDate("2026-11-24", -364), "2025-11-25");
});

test("calculateStreaks: totals, longest run, and a current streak that survives an empty today", () => {
  const days = calendar("2026-11-01", [1, 2, 0, 3, 3, 3, 3, 0, 4, 5]); // Nov 1 .. Nov 10, Nov 10 = today
  const result = calculateStreaks(days, "2026-11-10");
  assert.equal(result.total, 24);
  assert.equal(result.firstDate, "2026-11-01");
  assert.deepEqual(result.longest, { length: 4, start: "2026-11-04", end: "2026-11-07" });
  assert.deepEqual(result.current, { length: 2, start: "2026-11-09", end: "2026-11-10" });

  const emptyToday = calendar("2026-11-01", [1, 2, 0, 3, 3, 3, 3, 0, 4, 0]);
  const resultEmptyToday = calculateStreaks(emptyToday, "2026-11-10");
  assert.deepEqual(resultEmptyToday.current, { length: 1, start: "2026-11-09", end: "2026-11-09" });
});

test("calculateStreaks: a gap yesterday ends the current streak, future days are ignored, and empty input is safe", () => {
  const broken = calendar("2026-11-01", [5, 5, 5, 0, 0]);
  assert.deepEqual(calculateStreaks(broken, "2026-11-05").current, { length: 0, start: null, end: null });
  const withFuture = [...calendar("2026-11-01", [1, 1]), ...calendar("2026-11-03", [9, 9, 9])];
  const result = calculateStreaks(withFuture, "2026-11-02");
  assert.equal(result.total, 2);
  assert.equal(result.longest.length, 2);
  const empty = calculateStreaks([], "2026-11-05");
  assert.equal(empty.total, 0);
  assert.equal(empty.firstDate, null);
  assert.equal(empty.longest.length, 0);
  assert.equal(empty.current.length, 0);
});

test("calculateStreaks: the last-year window is exactly 365 days ending today", () => {
  const days = calendar("2025-01-01", Array.from({ length: 700 }, () => 1));
  const today = shiftDate("2025-01-01", 699);
  const result = calculateStreaks(days, today);
  assert.equal(result.lastYear.total, 365);
  assert.equal(result.lastYear.activeDays, 365);
  assert.equal(result.lastYear.dayCount, 365);
  const sparse = calendar("2026-01-01", [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
  const sparseResult = calculateStreaks(sparse, "2026-01-10");
  assert.equal(sparseResult.lastYear.activeDays, 5);
});

test("formatDateRange hides the year inside the current year and shows Present for the total", () => {
  assert.equal(formatDateRange("2026-10-12", "2026-11-24", "2026-11-24", false), "Oct 12 - Nov 24");
  assert.equal(formatDateRange("2023-04-04", "2025-08-08", "2026-11-24", false), "Apr 4, 2023 - Aug 8, 2025");
  assert.equal(formatDateRange("2015-11-06", "2026-11-24", "2026-11-24", true), "Nov 6, 2015 - Present");
  assert.equal(formatDateRange(null, null, "2026-11-24", false), "-");
});

test("fetchGraphql returns data and throws on HTTP and GraphQL errors", async () => {
  const reply = (status, body) => async () => new Response(JSON.stringify(body), { status });
  assert.deepEqual(await fetchGraphql("{x}", {}, "t", reply(200, { data: { x: 1 } })), { x: 1 });
  await assert.rejects(fetchGraphql("{x}", {}, "t", reply(401, {})), /HTTP 401/);
  await assert.rejects(fetchGraphql("{x}", {}, "t", reply(200, { errors: [{ message: "Bad thing" }] })), /Bad thing/);
});

/**
 * A fake GitHub API answering the calls the cards need.
 *
 * @param {{ createdAt: string, days: Record<string, number>, repos?: unknown[], searchPrs?: number, searchIssues?: number }} data - What the fake returns.
 * @returns {typeof fetch} A stand-in fetch.
 */
const fakeGithub = (data) => async (url, init) => {
  const address = String(url);
  if (address.endsWith("/graphql")) {
    const query = JSON.parse(init.body).query;
    if (query.includes("createdAt")) {
      return new Response(JSON.stringify({ data: { user: { createdAt: data.createdAt } } }));
    }
    if (query.includes("search(")) {
      return new Response(JSON.stringify({ data: { pullRequests: { issueCount: data.searchPrs ?? 3 }, issues: { issueCount: data.searchIssues ?? 2 } } }));
    }
    const user = {};
    for (const alias of query.match(/y\d{4}/g)) {
      const year = alias.slice(1);
      const weeks = [{ contributionDays: Object.entries(data.days).filter(([date]) => date.startsWith(year)).map(([date, count]) => ({ date, contributionCount: count })) }];
      user[alias] = { contributionCalendar: { weeks } };
    }
    return new Response(JSON.stringify({ data: { user } }));
  }
  if (address.includes("/repos?")) {
    return new Response(JSON.stringify(data.repos ?? [{ fork: false, stargazers_count: 7 }]));
  }
  if (address.includes("/users/")) {
    return new Response(JSON.stringify({ public_repos: 12, followers: 4 }));
  }
  return new Response("", { status: 404 });
};

test("fetchContributionDays asks for one aliased field per year and merges them in date order", async () => {
  const days = await fetchContributionDays("u", "t", fakeGithub({ createdAt: "2024-06-01T00:00:00Z", days: { "2025-02-01": 3, "2024-12-31": 1, "2026-01-02": 5 } }), new Date("2026-06-01T00:00:00Z"));
  assert.deepEqual(days.map((day) => day.date), ["2024-12-31", "2025-02-01", "2026-01-02"]);
  assert.deepEqual(days.map((day) => day.count), [1, 3, 5]);
});

test("fetchProfileStats rejects odd usernames and collects public-only numbers", async () => {
  await assert.rejects(fetchProfileStats('x") { evil', "t", fakeGithub({ createdAt: "2020-01-01T00:00:00Z", days: {} })), /Invalid GitHub username/);
  const stats = await fetchProfileStats("u", "t", fakeGithub({ createdAt: "2020-01-01T00:00:00Z", days: {}, searchPrs: 11, searchIssues: 6 }));
  assert.deepEqual(stats, { stars: 7, publicRepos: 12, followers: 4, pullRequests: 11, issues: 6 });
});

test("renderStatsCardSvg shows the numbers, escapes the name and clamps the ring", () => {
  const svg = renderStatsCardSvg({ name: "A <b> & 'C'", stars: 1234, lastYearContributions: 9, pullRequests: 8, issues: 7, publicRepos: 6, activeDayPercent: 250 });
  assert.match(svg, /1,234/);
  assert.match(svg, /100%/);
  assert.doesNotMatch(svg, /<b>/);
  assert.match(svg, /A &#60;b&#62; &#38; &#39;C&#39;/);
  assert.match(svg, /prefers-color-scheme: dark/);
  assert.match(renderStatsCardSvg({ name: "n", stars: 0, lastYearContributions: 0, pullRequests: 0, issues: 0, publicRepos: 0, activeDayPercent: -5 }), />0%</);
});

test("renderStreakCardSvg shows totals, both streaks with dates, and dashes when there is no streak", () => {
  const streaks = calculateStreaks(calendar("2026-11-01", [1, 1, 1, 0, 2, 2]), "2026-11-06");
  const svg = renderStreakCardSvg(streaks, "2026-11-06");
  assert.match(svg, />7</);
  assert.match(svg, /Nov 1 - Present/);
  assert.match(svg, /Nov 5 - Nov 6/);
  assert.match(svg, /Nov 1 - Nov 3/);
  const none = renderStreakCardSvg(calculateStreaks([], "2026-11-06"), "2026-11-06");
  assert.match(none, />-</);
});

test("renderGithubCards builds a two-column table and escapes alt text", () => {
  const html = renderGithubCards({ statsHref: "./a.svg?v=1", streakHref: "./b.svg?v=2", statsAlt: 'x "y"', streakAlt: "z" });
  assert.match(html, /^<table>/);
  assert.equal((html.match(/<td width="50%">/g) ?? []).length, 2);
  assert.match(html, /alt="x &#34;y&#34;"/);
});

test("buildGithubCards produces both SVGs and versioned markup from one set of fetches", async () => {
  const result = await buildGithubCards(
    { githubUser: "u", displayName: "Test User", githubToken: "t", statsHref: "./s.svg", streakHref: "./k.svg", now: new Date("2026-11-10T12:00:00Z") },
    { fetchImplementation: fakeGithub({ createdAt: "2026-01-01T00:00:00Z", days: { "2026-11-08": 1, "2026-11-09": 2, "2026-11-10": 3 } }) },
  );
  assert.match(result.markdown, /src="\.\/s\.svg\?v=[0-9a-f]{8}"/);
  assert.match(result.markdown, /src="\.\/k\.svg\?v=[0-9a-f]{8}"/);
  assert.match(result.statsSvg, /Test User&#39;s GitHub Stats/);
  assert.match(result.streakSvg, /Nov 8 - Nov 10/);
  assert.match(result.markdown, /3 day current streak/);
});

const STEAM_XML = `<?xml version="1.0"?><profile><steamID64>76561198148711757</steamID64><privacyState>public</privacyState>
<mostPlayedGames>
<mostPlayedGame><gameName><![CDATA[Game & One]]></gameName><gameLink><![CDATA[https://steamcommunity.com/app/111]]></gameLink><hoursPlayed>2.5</hoursPlayed><hoursOnRecord>1,234.5</hoursOnRecord></mostPlayedGame>
<mostPlayedGame><gameName><![CDATA[Broken]]></gameName><gameLink><![CDATA[https://steamcommunity.com/nope]]></gameLink><hoursPlayed>1</hoursPlayed><hoursOnRecord>1</hoursOnRecord></mostPlayedGame>
</mostPlayedGames></profile>`;

test("fetchSteamProfile parses the account id, privacy and recent games (commas, CDATA, bad links)", async () => {
  const profile = await fetchSteamProfile("vap", async () => new Response(STEAM_XML));
  assert.equal(profile.steamId, "76561198148711757");
  assert.equal(profile.isPublic, true);
  assert.deepEqual(profile.recentGames, [{ appId: 111, name: "Game & One", hoursLastTwoWeeks: 2.5, hoursTotal: 1234.5 }]);
  const priv = await fetchSteamProfile("vap", async () => new Response(STEAM_XML.replace("public", "friendsonly")));
  assert.equal(priv.isPublic, false);
  await assert.rejects(fetchSteamProfile("vap", async () => new Response("<profile></profile>")), /no account id/);
  await assert.rejects(fetchSteamProfile("vap", async () => new Response("", { status: 500 })), /HTTP 500/);
  await assert.rejects(fetchSteamProfile("../etc", async () => new Response("")), /Invalid Steam profile name/);
});

test("fetchOwnedGames converts minutes to hours and never leaks the key in errors", async () => {
  const games = await fetchOwnedGames("KEY", "1", async () => new Response(JSON.stringify({ response: { games: [{ appid: 5, name: "G", playtime_forever: 90, playtime_2weeks: 30 }] } })));
  assert.deepEqual(games, [{ appId: 5, name: "G", hoursLastTwoWeeks: 0.5, hoursTotal: 1.5 }]);
  assert.deepEqual(await fetchOwnedGames("KEY", "1", async () => new Response(JSON.stringify({ response: {} }))), []);
  await assert.rejects(fetchOwnedGames("SECRETKEY", "1", async () => new Response("", { status: 403 })), (error) => /HTTP 403/.test(error.message) && !error.message.includes("SECRETKEY"));
});

test("selectSteamGames puts recent play first, then total hours, and drops empty games", () => {
  const games = [
    { appId: 1, name: "Big", hoursLastTwoWeeks: 0, hoursTotal: 900 },
    { appId: 2, name: "Recent small", hoursLastTwoWeeks: 1, hoursTotal: 5 },
    { appId: 3, name: "Recent big", hoursLastTwoWeeks: 9, hoursTotal: 50 },
    { appId: 4, name: "", hoursLastTwoWeeks: 0, hoursTotal: 100 },
    { appId: 5, name: "Never played", hoursLastTwoWeeks: 0, hoursTotal: 0 },
    { appId: 6, name: "Medium", hoursLastTwoWeeks: 0, hoursTotal: 300 },
  ];
  assert.deepEqual(selectSteamGames(games, 3).map((game) => game.name), ["Recent big", "Recent small", "Big"]);
});

test("formatHours uses one decimal under ten hours and separators above", () => {
  assert.equal(formatHours(0.2), "0.2");
  assert.equal(formatHours(9.96), "10.0");
  assert.equal(formatHours(1567.2), "1,567");
});

test("fetchImageDataUri accepts only small https JPEGs", async () => {
  const jpeg = (body = Buffer.from("x"), type = "image/jpeg") => async () => new Response(body, { headers: { "content-type": type } });
  assert.match(await fetchImageDataUri("https://a/b.jpg", 100, jpeg()), /^data:image\/jpeg;base64,/);
  assert.equal(await fetchImageDataUri("http://a/b.jpg", 100, jpeg()), null);
  assert.equal(await fetchImageDataUri("https://a/b.png", 100, jpeg(undefined, "image/png")), null);
  assert.equal(await fetchImageDataUri("https://a/b.jpg", 3, jpeg(Buffer.alloc(10))), null);
  assert.equal(await fetchImageDataUri("https://a/b.jpg", 100, async () => { throw new Error("offline"); }), null);
});

test("renderSteamSvg draws tiles, a placeholder without a picture, recent hours only when present, and escapes names", () => {
  const svg = renderSteamSvg([
    { name: "Game <&>", hoursLastTwoWeeks: 2.5, hoursTotal: 100, imageDataUri: "data:image/jpeg;base64,AAAA" },
    { name: "No Picture", hoursLastTwoWeeks: 0, hoursTotal: 3, imageDataUri: null },
  ]);
  assert.equal((svg.match(/<image /g) ?? []).length, 1);
  assert.match(svg, /Game &#60;&#38;&#62;/);
  assert.match(svg, /2\.5 hrs in the last 2 weeks/);
  assert.equal((svg.match(/in the last 2 weeks/g) ?? []).length, 1); // only the first game has recent hours
});

test("renderSteamSection links the grid to the profile and lists store links", () => {
  const text = renderSteamSection([{ appId: 77, name: "Stel_laris", hoursLastTwoWeeks: 0, hoursTotal: 718 }], "./s.svg?v=1", "https://steamcommunity.com/id/x");
  assert.match(text, /<a href="https:\/\/steamcommunity\.com\/id\/x"><img src="\.\/s\.svg\?v=1" alt="Steam games: Stel_laris, 718 hours on record"/);
  assert.match(text, /1\. \[\*\*Stel\\_laris\*\*\]\(https:\/\/store\.steampowered\.com\/app\/77\): 718 hrs on record/);
});

/**
 * A fake Steam answering the profile XML, the owned-games API and the pictures.
 *
 * @param {{ xml?: string, owned?: unknown, imagesOk?: boolean }} options - What the fake returns.
 * @returns {typeof fetch} A stand-in fetch.
 */
const fakeSteam = (options) => async (url) => {
  const address = String(url);
  if (address.includes("steamcommunity.com/id/")) return new Response(options.xml ?? STEAM_XML);
  if (address.includes("GetOwnedGames")) return new Response(JSON.stringify(options.owned ?? { response: {} }));
  if (address.includes("steamstatic.com")) {
    return options.imagesOk === false ? new Response("", { status: 404 }) : new Response(Buffer.from("jpg"), { headers: { "content-type": "image/jpeg" } });
  }
  return new Response("", { status: 404 });
};

test("buildSteamGames uses the whole library with a key, and falls back to the public profile otherwise", async () => {
  const owned = { response: { games: [{ appid: 1, name: "Library Game", playtime_forever: 6000 }, { appid: 2, name: "Other", playtime_forever: 60 }] } };
  const withKey = await buildSteamGames({ steamVanity: "v", steamApiKey: "K", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({ owned }) });
  assert.match(withKey.svg, /Library Game/);
  assert.match(withKey.markdown, /src="\.\/s\.svg\?v=[0-9a-f]{8}"/);

  const noKey = await buildSteamGames({ steamVanity: "v", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({}) });
  assert.match(noKey.svg, /Game &#38; One/);
  const emptyLibrary = await buildSteamGames({ steamVanity: "v", steamApiKey: "K", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({ owned: { response: {} } }) });
  assert.match(emptyLibrary.svg, /Game &#38; One/);
});

test("buildSteamGames shows placeholders when pictures fail and refuses private or empty profiles", async () => {
  const noPictures = await buildSteamGames({ steamVanity: "v", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({ imagesOk: false }) });
  assert.doesNotMatch(noPictures.svg, /<image /);
  await assert.rejects(buildSteamGames({ steamVanity: "v", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({ xml: STEAM_XML.replace("public", "private") }) }), /not public/);
  const emptyXml = STEAM_XML.replace(/<mostPlayedGames>[\s\S]*<\/mostPlayedGames>/, "");
  await assert.rejects(buildSteamGames({ steamVanity: "v", steamSvgHref: "./s.svg" }, { fetchImplementation: fakeSteam({ xml: emptyXml }) }), /No Steam games found/);
});
