import type { MetadataRoute } from 'next';

/**
 * Next.js metadata route — serves `/sitemap.xml`.
 *
 * The console is an internal, authenticated surface (ADR 0009) with nothing meant to be indexed —
 * see `robots.ts` (same directory), which disallows every crawler outright. This sitemap is
 * intentionally, permanently empty: an empty array still produces a valid `<urlset>` document with
 * zero `<url>` entries, which is a well-formed (if pointless) sitemap rather than a 404 — the
 * standard-compliant way to say "nothing to list" without hosting stale or fabricated URLs.
 *
 * Must stay reachable unauthenticated: `middleware.ts`'s matcher excludes `sitemap.xml` from the
 * session gate, so this never 307s to `/auth/login`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
