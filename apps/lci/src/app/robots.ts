import type { MetadataRoute } from 'next';

/**
 * Next.js metadata route — serves `/robots.txt`.
 *
 * LCI is an internal, authenticated surface: every real screen sits under the `(lci)` route
 * group's session check. Nothing here is meant to be discoverable by a search engine or
 * general-purpose crawler. `Disallow: /` for every user agent blocks the entire origin.
 *
 * Lives outside the `(lci)` route group, so it stays reachable unauthenticated — a config- and
 * session-independent "is the Node server serving requests" signal for a liveness/readiness probe.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
