/**
 * The public origin for share links, canonical URLs, OG cards and the sitemap.
 *
 * NEXT_PUBLIC_SITE_URL wins when set. Otherwise Vercel's system variable gives
 * the production domain, so a deploy without the variable never publishes
 * localhost links. localhost is only the local-dev fallback.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:3000'
).replace(/\/$/, '');
