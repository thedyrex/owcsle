import type { MetadataRoute } from 'next';

/**
 * The site had no robots.txt, so everything was crawlable by default — this
 * keeps that true for every page except one.
 *
 * Signing links are private: they name a player and carry an authentication
 * code. Discord and the other unfurlers honour robots.txt, so disallowing the
 * path stops a link pasted into a channel from fetching the page and turning
 * into a preview card at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/player/',
    },
  };
}
