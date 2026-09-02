import type { CallbackStatus } from './callback-status';

/**
 * The page's copy, carried over verbatim from the Rust template this app replaces
 * (`app/governance-auth/src/oauth/callback_page/mod.rs` in `lightbridge-governance`, whose unit
 * tests assert on these exact sentences). Rewording any of it is a two-repo change.
 *
 * Literal English strings, not `t('key')`: `@lightbridge/i18n` has no consumer on the web surface
 * — neither `apps/console` nor `apps/authz-ui` import it (AGENTS.md §2 calls that out) — and this
 * page renders four sentences on a loopback socket. Adding a translation runtime here would make
 * this the only localised web app in the repo, and every one of its strings would still be the
 * only copy of that string anywhere.
 */
export const CALLBACK_COPY: Record<CallbackStatus, { heading: string; detail: string }> = {
  success: {
    heading: "You're signed in",
    detail: 'Your terminal has the session. This tab is finished with.',
  },
  error: {
    heading: 'Sign-in failed',
    detail: 'Nothing was saved. Your terminal has the reason — check there.',
  },
};

/**
 * Shown while the close attempt is still pending.
 *
 * It says "closing", never "closed": browsers honour `window.close()` only for windows a script
 * opened, and this tab was reached by a redirect the user followed. The page tries, and then says
 * what is actually true.
 */
export const CLOSE_PENDING_HINT = 'Closing this tab…';

/** Shown once the close attempt has run — which, for a navigated-to tab, means it was refused. */
export const CLOSE_REFUSED_HINT = 'You can close this tab and return to your terminal.';
