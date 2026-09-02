import { useEffect, useState } from 'react';

import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { META_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { AuthErrorPanel } from '@lightbridge/ui-web/src/sections/auth-error-panel';
import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';

import { CALLBACK_COPY, CLOSE_HINT, STALE_HINT } from './callback-copy';
import type { CallbackStatus } from './callback-status';

/**
 * How long the page presents itself as current.
 *
 * Five minutes, and nothing happens at the end of it except the hint changing — the page does NOT
 * close, navigate or clear itself. See {@link useIsStale}.
 */
export const FRESH_FOR_MS = 5 * 60 * 1000;

export interface CallbackPageProps {
  /** The outcome the Rust side already decided — see `callback-status.ts`. */
  status: CallbackStatus;
}

/**
 * `true` once the page has been open longer than {@link FRESH_FOR_MS}.
 *
 * ⚠️ This replaced a `window.close()` attempt on a 1.2s timer. Two things were wrong with it: a tab
 * reached by a redirect cannot be closed by script (browsers allow it only for windows a script
 * opened), so it was refused every single time; and while it was pending the page said "Closing
 * this tab…", which was never going to become true. Auto-dismissing the user's tab is also not
 * ours to do — they navigated here, and the terminal is where the outcome actually lives.
 *
 * So nothing is dismissed. The only thing the timer changes is the hint, so a tab found open the
 * next morning stops asserting a sign-in that happened hours ago in the present tense.
 */
function useIsStale(): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStale(true), FRESH_FOR_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return stale;
}

/**
 * The whole app: one panel, two possible outcomes, no navigation and no fetch.
 *
 * Composed from `packages/ui-web` only — `AuthPanelShell` for the auth-plane layout (the same one
 * `apps/authz-ui`'s device pages render into), `AuthErrorPanel` for the failure statement, and
 * `InlineStatus` for the success statement and the close hint. Nothing here declares a Tailwind
 * class of its own; `META_CLASS` steps the hint down one type role, which is the only visual
 * decision this file makes.
 *
 * NO STATUS ICON, and no signal colour on the success path. ADR 0008's status-as-text rule
 * (unchanged by ADR 0012, console-ui skill) is what the Rust template's green/red circled glyph
 * traded away, and it is also the accessibility answer: the outcome is the *heading*, and the
 * statement under it is announced (`role="alert"` for failure, `role="status"` for success), so
 * nothing about the outcome is carried by colour.
 */
export function CallbackPage({ status }: CallbackPageProps) {
  const stale = useIsStale();
  const { heading, detail } = CALLBACK_COPY[status];

  return (
    <AuthPanelShell title={heading}>
      {status === 'success' ? (
        <InlineStatus>{detail}</InlineStatus>
      ) : (
        <AuthErrorPanel message={detail} />
      )}

      <InlineStatus className={META_CLASS}>{stale ? STALE_HINT : CLOSE_HINT}</InlineStatus>
    </AuthPanelShell>
  );
}
