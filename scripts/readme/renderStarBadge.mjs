/**
 * Renders the "Stars Received" badge as a static Shields.io image.
 *
 * @param {number} totalStars - The total star count.
 * @returns {string} Markdown for the section body.
 */
export const renderStarBadge = (totalStars) =>
  `![Stars received: ${totalStars}](https://img.shields.io/badge/Stars%20Received-${totalStars}-black?style=for-the-badge)`;
