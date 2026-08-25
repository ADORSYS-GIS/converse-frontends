import type { MetadataRoute } from 'next';

/**
 * Next.js metadata route — serves `/robots.txt`.
 *
 * The console is an internal, authenticated surface (ADR 0009): every non-auth route sits behind
 * `middleware.ts`'s session-cookie gate, and nothing here is meant to be discoverable by a search
 * engine or general-purpose crawler. `Disallow: /` for every user agent blocks the entire origin.
 *
 * Deliberately omits a `Sitemap:` directive. `sitemap.ts` (same directory) publishes a permanently
 * empty sitemap — there is nothing in it to point a crawler at, and a `Disallow: /` already
 * instructs every RFC 9309-compliant crawler to fetch nothing from this origin regardless, sitemap
 * or not. Omitting the reference keeps `robots.txt` minimal instead of pointing at a document with
 * zero URLs; this is the standard-compliant combination (RFC 9309 does not require a `Sitemap`
 * field), not an oversight.
 *
 * Must stay reachable unauthenticated: `middleware.ts`'s matcher excludes `robots.txt` from the
 * session gate, so this never 307s to `/auth/login`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
