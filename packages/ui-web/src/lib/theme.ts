/**
 * Theme resolution for every Lightbridge web surface (ADR 0010 Decision 5, console-ui skill
 * "Light theme rules"). Promoted out of `apps/console/src/shared/theme.ts` when `apps/authz-ui`
 * (the hosted-login SPA) needed the identical `black`-default / `wireframe`-honored contract:
 * two apps, one resolution order, one place to change it.
 *
 * Plain functions and constants only -- no React, no `'use client'` -- so this module is safe to
 * import from a Next server component (`apps/console/src/app/layout.tsx`, for the pre-hydration
 * script's literal source), from client code (`client/use-console-theme.ts`), and from a Vite
 * SPA's entry module (`apps/authz-ui/src/main.tsx`).
 *
 * Resolution order for a session: stored preference -> `prefers-color-scheme` -> `black`
 * (`black` is always the final fallback, never `wireframe`).
 *
 * The names keep their `Console` prefix and the storage key keeps its `lb-console-` prefix on
 * purpose. `localStorage` is per-origin and the two consumers are on different origins (the
 * console vs the auth issuer), so there is no collision to design around and no second key to
 * introduce; parameterizing the key would be flexibility nothing asks for. Renaming would only
 * churn the console's call sites.
 */

export type ConsoleTheme = 'black' | 'wireframe';
export type ConsoleThemePreference = ConsoleTheme | 'system';

/** `localStorage` key. Presence = an explicit choice; absence = follow `prefers-color-scheme`. */
export const CONSOLE_THEME_STORAGE_KEY = 'lb-console-theme';

function isConsoleTheme(value: unknown): value is ConsoleTheme {
  return value === 'black' || value === 'wireframe';
}

function systemTheme(): ConsoleTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'wireframe' : 'black';
}

/** Resolves a preference (including `'system'`) to the concrete theme that should be applied. */
export function resolveConsoleTheme(preference: ConsoleThemePreference): ConsoleTheme {
  return preference === 'system' ? systemTheme() : preference;
}

/** Reads the stored explicit preference, or `null` if none is stored (i.e. `'system'`). */
export function readStoredThemePreference(): ConsoleTheme | null {
  try {
    const stored = window.localStorage.getItem(CONSOLE_THEME_STORAGE_KEY);
    return isConsoleTheme(stored) ? stored : null;
  } catch {
    // Storage unavailable (private mode, quota, disabled) -- behave as if unset.
    return null;
  }
}

/**
 * Persists `preference` (or clears it, for `'system'`) and applies the resolved theme to
 * `<html data-theme>` immediately -- the mechanism `[data-theme]` selectors in
 * `packages/ui-web/src/theme.css` key off (daisyUI's `[data-theme]` machinery).
 */
export function applyThemePreference(preference: ConsoleThemePreference): void {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(CONSOLE_THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, preference);
    }
  } catch {
    // The DOM attribute below still applies for the current tab even if it cannot persist.
  }
  document.documentElement.dataset.theme = resolveConsoleTheme(preference);
}

/**
 * Source for the blocking, pre-hydration `<script>` `apps/console`'s root layout inlines into
 * `<head>` (ADR 0010 Decision 5). Kept dependency-free, defensive (`try/catch`), and IIFE-wrapped
 * since it runs before any module of ours loads, outside React, directly as parsed HTML.
 *
 * `apps/authz-ui` deliberately does NOT use this constant: `authz-idp` serves that app under a
 * `default-src 'self'` CSP with no `'unsafe-inline'`, nonce or hash
 * (`crates/lightbridge-authz-rest/src/static_assets.rs`), so an inline script there would be
 * blocked outright. It sets `data-theme="black"` statically in `index.html` and calls
 * `applyThemePreference` at the top of its entry module instead -- see that app's README.
 */
export const CONSOLE_THEME_NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(
  CONSOLE_THEME_STORAGE_KEY
)};var s=window.localStorage.getItem(k);var t=(s==='black'||s==='wireframe')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'wireframe':'black');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='black';}})();`;
