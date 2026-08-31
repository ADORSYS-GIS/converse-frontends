// THE SINGLE SOURCE OF THE ROUTE SET. Three consumers read this file and no other:
//   1. src/app.tsx        — renders one <Route> per entry
//   2. src/main.tsx       — <BrowserRouter basename={ROUTER_BASENAME}>
//   3. vite.config.ts     — emits dist/routes.json at closeBundle
// lightbridge-authz's static_assets.rs reads that emitted manifest at startup and 404s every
// /ui path not in it (lightbridge-authz#598). A route added here and nowhere else therefore
// works in `vite dev` AND in production; a route hand-added to app.tsx alone would 404 live.
// That drift is exactly what generating the manifest from this table prevents.

/** Matches authz-idp's `.nest_service("/ui", ..)` mount (lightbridge-authz lib.rs) and Vite's
 *  `base: '/ui/'`. Paths below are PREFIX-FREE because `nest_service` strips `/ui` before the
 *  request reaches the static service — the manifest describes that stripped path space. */
export const ROUTER_BASENAME = '/ui';

/** Exact paths only. No `:params`, no `*` wildcards: the Rust allowlist matches exactly, and
 *  `scripts/verify-routes-manifest.mjs` rejects either. Adding a parameterised route is a
 *  cross-repo change, not a one-line edit here. */
export const ROUTE_PATHS = [
  '/',
  '/device',
  '/device/invalid',
  '/device/confirm',
  '/device/success',
  '/error',
] as const;

export type RoutePath = (typeof ROUTE_PATHS)[number];
