import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CallbackPage } from './callback-page';
import { CALLBACK_COPY } from './callback-copy';
import { readCallbackStatusMarker, resolveCallbackStatus } from './callback-status';
import './index.css';

/**
 * Local preview only. `import.meta.env.DEV` is a compile-time constant, so this whole function —
 * and any reachability of the query string — is eliminated from the production bundle. Verified
 * by `scripts/verify-single-file.mjs`, which fails the build if `?status=` survives into `dist`.
 *
 * It exists because `vite dev` never sees a rewritten marker: without it the success page, which
 * is the page this app is mostly about, could not be looked at while designing it.
 */
function devStatusOverride(): string | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  return new URLSearchParams(window.location.search).get('status');
}

const status = resolveCallbackStatus(
  devStatusOverride() ?? readCallbackStatusMarker(document.documentElement)
);

// The Rust template carried the outcome in the tab title. `index.html` can only ship one title,
// so it ships the neutral one and the outcome is applied here — synchronously, before React
// mounts, so the tab never reads "Sign-in" for a frame.
document.title = `${CALLBACK_COPY[status].heading} · governance-auth`;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('governance-auth: #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <CallbackPage status={status} />
  </StrictMode>
);

// Dev-time accessibility reporting (#443): axe over the live DOM, findings in the browser console.
// Same `import.meta.env.DEV` compile-time constant `devStatusOverride` above relies on, and the
// same consequence — the branch, the dynamic `import()` and `axe-core` behind it are all
// eliminated from `dist`. This app's `scripts/verify-single-file.mjs` inlines everything into one
// HTML file, so anything that survived would be impossible to miss; the grep proving it does not
// is in `docs/knowledge/accessibility.md`. `@axe-core/react` is deliberately not used — see
// `packages/ui-web/src/dev/axe-reporter.ts` for the React 19 reason.
if (import.meta.env.DEV) {
  void import('@lightbridge/ui-web/src/dev/axe-reporter').then(({ startDevA11yReporter }) =>
    startDevA11yReporter({ appName: 'governance-auth' })
  );
}
