/**
 * Shared CSS for the generated GitHub cards. Colours are CSS variables with a
 * dark-mode override, which works inside an SVG shown through an `<img>`.
 *
 * @type {string}
 */
export const CARD_STYLE = `
    :root { --bg: #ffffff; --border: #d0d7de; --text: #24292f; --muted: #57606a; --accent: #0969da; --fire: #d9480f; --track: #e6e9ed; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0d1117; --border: #30363d; --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff; --fire: #ff922b; --track: #2b3139; }
    }
    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif; }
    .card { fill: var(--bg); stroke: var(--border); }
    .title { fill: var(--accent); font-size: 18px; font-weight: 600; }
    .label { fill: var(--text); font-size: 14px; font-weight: 600; }
    .value { fill: var(--text); font-size: 14px; font-weight: 700; }
    .muted { fill: var(--muted); font-size: 12px; }
    .icon { fill: var(--accent); }
    .track { fill: none; stroke: var(--track); }
    .progress { fill: none; stroke: var(--accent); stroke-linecap: round; }
    .divider { stroke: var(--border); }
`;
