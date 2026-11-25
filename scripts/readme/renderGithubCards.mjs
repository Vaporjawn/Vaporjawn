import { escapeXml } from "./escapeXml.mjs";

/**
 * Renders the two generated GitHub cards as a two-column HTML table, with
 * descriptive alt text built from the numbers on the cards.
 *
 * @param {{ statsHref: string, streakHref: string, statsAlt: string, streakAlt: string }} cards - Image paths (already versioned) and alt text.
 * @returns {string} HTML for the section body.
 */
export const renderGithubCards = (cards) => `<table>
<tr>
<td width="50%">

<img src="${cards.statsHref}" alt="${escapeXml(cards.statsAlt)}" width="100%">

</td>
<td width="50%">

<img src="${cards.streakHref}" alt="${escapeXml(cards.streakAlt)}" width="100%">

</td>
</tr>
</table>`;
