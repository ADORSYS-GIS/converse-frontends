import type { CallbackStatus } from './callback-status';

/**
 * The page's copy, carried over verbatim from the Rust template this app replaces
 * (`app/governance-auth/src/oauth/callback_page/mod.rs` in `lightbridge-governance`, whose unit
 * tests assert on these exact sentences). Rewording any of it is a two-repo change.
 *
 * Literal English strings, not `t('key')`: this page is outside the console's i18n tree (ADR 0017)
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
 * Shown as soon as the page renders.
 *
 * The page NEVER closes itself. `window.close()` used to be attempted after 1.2s, and browsers
 * honour it only for windows a script opened — this tab was reached by a redirect the user
 * followed, so it was refused every time and the "Closing this tab…" it showed in the meantime was
 * never true. Saying the true thing immediately is shorter and more honest than saying a false
 * thing and then correcting it.
 */
export const CLOSE_HINT = 'You can close this tab and return to your terminal.';

/**
 * Replaces {@link CLOSE_HINT} once the page has been open longer than {@link FRESH_FOR_MS}.
 *
 * A tab left open overnight otherwise goes on asserting a sign-in that happened hours ago, in the
 * present tense. This does not close anything — it just stops the page claiming to be current.
 */
export const STALE_HINT = 'This page is from an earlier sign-in. Your terminal has the session.';
