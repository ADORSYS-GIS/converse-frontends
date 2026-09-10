/**
 * Percent-decoding for App Router dynamic segments — the ONE place a `[param]` is turned back into
 * the value a link encoded (converse-frontends#449, owner report 2026-09-03).
 *
 * ## Why this exists at all
 *
 * **Next.js does not decode a page's route params.** Measured against this repo's own Next
 * (16.3.2, Turbopack) with a throwaway probe route on 2026-09-03:
 *
 * | request                                        | Route Handler `params.id`         | Page `params.id`                   |
 * | ---------------------------------------------- | --------------------------------- | ---------------------------------- |
 * | `/…/cratestack%2Fcratestack`                    | `cratestack/cratestack` (decoded) | `cratestack%2Fcratestack` (RAW)    |
 * | `/…/missing%3Agithub%3Apreferred_username`      | decoded                           | RAW                                |
 * | `/…/a%2520b`                                    | decoded                           | `a%2520b` (RAW)                    |
 *
 * A Route Handler goes through `getRouteMatcher`, which calls `decodeURIComponent` per group; a
 * page's `params` are read straight off the Flight router tree's segment values, which are the raw
 * pathname segments. `useParams()` is the same tree (`getSelectedParams` in Next's own
 * `compute-changed-path`), so a CLIENT component sees the raw value too — which is why
 * `useAccountId`/`useConsoleScope` decode through here as well.
 *
 * The bug that made this visible: an account id that is a repo slug (`cratestack/cratestack`).
 * `actorHref` correctly encodes it to `/admin/usage/actors/cratestack%2Fcratestack?type=account`,
 * the page received `cratestack%2Fcratestack` verbatim, and every panel queried
 * `scope_id: "cratestack%2Fcratestack"` — an id that exists nowhere, so the page rendered a
 * complete, confident, EMPTY dashboard. Nothing failed; the numbers were simply about nobody.
 *
 * ## The contract: decoded EXACTLY ONCE, at the route boundary
 *
 * A route (or the client hook standing in for one) decodes; everything downstream — the container,
 * `resolveDashboard`'s `$param` substitution, the query, the header label — carries the DECODED
 * value and never touches it again. Link builders (`actorHref`, `channelHref`, `modelHref`) are the
 * mirror: they `encodeURIComponent` the id segment on the way out. A second decode anywhere in
 * between would corrupt an id containing a literal `%` (`a%20b` → `a b`), which is exactly why
 * this is one named function with one call site per route rather than a defensive `try { decode }`
 * sprinkled through the containers.
 *
 * Pure, dependency-free and framework-free, so both a Server Component and a `'use client'` hook
 * can import it (and a unit test can round-trip it against the builders).
 */

/**
 * One raw dynamic segment → the value the link encoded.
 *
 * A MALFORMED sequence (`%`, `%zz`, a lone surrogate escape) makes `decodeURIComponent` throw a
 * `URIError`. That is a hand-typed URL, not a link this console minted, and the honest answer is
 * the segment as it stands: the page then queries an id that does not exist and renders the same
 * "no usage" reading any unknown id gets. Throwing would turn a typo into a 500, and returning an
 * empty string would silently widen a scoped query — neither is better than the raw string.
 */
export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
