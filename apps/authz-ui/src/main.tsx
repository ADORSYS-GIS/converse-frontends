import { registerSW } from 'virtual:pwa-register';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { applyThemePreference, readStoredThemePreference } from '@lightbridge/ui-web/src/lib/theme';

import { App } from './app';
import { ROUTER_BASENAME } from './routes/route-table';
import './index.css';

// Theme bootstrap, FIRST — before React, before anything renders (ADR 0010 Decision 5's
// resolution order: stored preference -> prefers-color-scheme -> black). `index.html` already
// carries `data-theme="black"` statically, so this only ever CHANGES the attribute when the user
// has an explicit `wireframe` preference or is on `system` with a light OS setting. It runs here
// rather than as a blocking inline script in `index.html` because `static_assets.rs` serves this
// page with `default-src 'self'` and no inline-script allowance — see `index.html`'s comment.
applyThemePreference(readStoredThemePreference() ?? 'system');

// ADR-0021 Decision 10: registers the precache-only service worker (src/sw.ts). `autoUpdate`
// means a new SW activates and takes over as soon as it finishes installing -- no user prompt, no
// stale version pinned indefinitely. That matters specifically on this origin: a pinned stale SW
// on a login page is a lockout, not a convenience. See src/sw.ts for what this SW does and, just
// as importantly, does not do.
registerSW({ immediate: true });

// Dev-time accessibility reporting (#443): axe over the live DOM, findings in the browser console.
//
// This app was the one where the answer was NOT obvious — it is the hosted login surface, served
// by authz-idp under `default-src 'self'` with no `data:` carve-out (#407), and its build runs
// three verification scripts over the output. So it was checked rather than assumed, and the
// answer is that it is safe: `import.meta.env.DEV` is a compile-time constant Vite substitutes
// before Rollup runs, so in `vite build` this reads `if (false)` and the dynamic `import()` — and
// `axe-core` with it — is eliminated. It is also never a `<link rel=modulepreload>` or a precached
// entry, because no chunk is emitted for it at all. Proof (a grep of `dist/` for `axe`, plus the
// three verify scripts green) is recorded in `docs/knowledge/accessibility.md`; re-run it if this
// import shape ever changes. `@axe-core/react` is not used anywhere — see
// `packages/ui-web/src/dev/axe-reporter.ts` for the React 19 reason.
if (import.meta.env.DEV) {
  void import('@lightbridge/ui-web/src/dev/axe-reporter').then(({ startDevA11yReporter }) =>
    startDevA11yReporter({ appName: 'authz-ui' })
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('authz-ui: #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* basename is MANDATORY, not cosmetic: this app is served under authz-idp's /ui prefix, so
        `location.pathname` is `/ui/device`, and a router with no basename would match none of
        `route-table.ts`'s prefix-free paths. Before real routes existed this was masked by
        app.tsx's `<Route path="*">` catch-all, which rendered the placeholder for everything. */}
    <BrowserRouter basename={ROUTER_BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
