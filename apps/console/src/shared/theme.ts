/**
 * Console theme resolution (ADR 0010 Decision 5, console-ui skill "Light theme rules").
 *
 * Plain functions and constants only -- no React, no `'use client'` -- so this module is safe to
 * import from both the server root layout (for the pre-hydration script's literal source) and
 * client code (`client/use-console-theme.ts`, the `ThemeToggle` component).
 *
 * Resolution order for a session: stored preference -> `prefers-color-scheme` -> `black`
 * (`black` is always the final fallback, never `wireframe`).
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
 * Source for the blocking, pre-hydration `<script>` the root layout inlines into `<head>`
 * (ADR 0010 Decision 5: "A blocking inline script in the `apps/console` root layout sets
 * `document.documentElement.dataset.theme` before first paint so there is no flash"). Kept
 * dependency-free, defensive (`try/catch`), and IIFE-wrapped since it runs before any module of
 * ours loads, outside React, directly as parsed HTML.
 */
export const CONSOLE_THEME_NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(
  CONSOLE_THEME_STORAGE_KEY
)};var s=window.localStorage.getItem(k);var t=(s==='black'||s==='wireframe')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'wireframe':'black');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='black';}})();`;
