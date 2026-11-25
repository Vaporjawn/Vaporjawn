/**
 * Renders the "Stars Received" badge as a static Shields.io image that links
 * to the user's repositories sorted by stars.
 *
 * @param {number} totalStars - The total star count.
 * @param {string} user - The GitHub username whose repositories the badge links to.
 * @returns {string} Markdown for the section body.
 */
export const renderStarBadge = (totalStars, user) =>
  `[![Stars received: ${totalStars}](https://img.shields.io/badge/Stars%20Received-${totalStars}-black?style=for-the-badge)](https://github.com/${encodeURIComponent(user)}?tab=repositories&sort=stargazers)`;
