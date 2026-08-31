/**
 * The three preferences the console theme can hold (ADR 0010 Decision 5) -- `'system'` means "no
 * stored preference, follow `prefers-color-scheme`". `AccountMenu` used to hold the equivalent
 * `AccountMenuTheme` type for its own now-removed theme section (owner finding, 2026-08-31: the
 * toggle moved out of the account dropdown entirely -- `ThemeToggle` is the only place this
 * preference is edited now); this type has no import relationship with `AccountMenu` on purpose,
 * each component is a pure, independently typed slot (console-ui skill "Component conventions").
 */
export type ThemeTogglePreference = 'black' | 'wireframe' | 'system';

export interface ThemeToggleProps {
  /** The active theme preference -- drives which glyph renders and what the next click sets. */
  preference: ThemeTogglePreference;
  /**
   * Fires with the NEXT preference in the dark -> light -> system -> dark cycle. `ui-web` owns no
   * `localStorage`/DOM side effect itself (console-ui skill: data via typed props, callbacks are
   * props) -- the consumer (`apps/console`) persists the choice and writes `data-theme`.
   */
  onPreferenceChange: (next: ThemeTogglePreference) => void;
  className?: string;
}
