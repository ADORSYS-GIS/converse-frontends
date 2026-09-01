import React from 'react';

import { Button } from '../button';
import type { ThemeToggleProps, ThemeTogglePreference } from './types';

/** dark -> light -> system -> dark. */
const NEXT_PREFERENCE: Record<ThemeTogglePreference, ThemeTogglePreference> = {
  black: 'wireframe',
  wireframe: 'system',
  system: 'black',
};

const PREFERENCE_WORD: Record<ThemeTogglePreference, string> = {
  black: 'dark',
  wireframe: 'light',
  system: 'system',
};

// 12px structural line glyphs (console-ui skill: "structural, not decorative" --
// `section-sheet-trigger`'s glyph set is the style precedent: `fill="none" stroke="currentColor"`,
// small filled dots only where a glyph calls for one). One per preference so the button always
// shows what is CURRENTLY active, never what clicking it would do.
function ThemeGlyph({ preference }: { preference: ThemeTogglePreference }) {
  if (preference === 'black') {
    // Moon -- current preference is dark. Feather's "moon" outline, scaled to the 12px viewBox.
    return (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <path
          d="M10.5 6.395A4.5 4.5 0 1 1 5.605 1.5a3.5 3.5 0 0 0 4.895 4.895Z"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (preference === 'wireframe') {
    // Sun -- current preference is light.
    return (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <circle cx="6" cy="6" r="2.2" />
        <path d="M6 0.8v1.6M6 9.6v1.6M0.8 6h1.6M9.6 6h1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // System -- follows `prefers-color-scheme`; a small display mark reads as "auto" without a
  // third colour or a stitched-together sun/moon split (console-ui skill: monochrome, minimal).
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <rect x="1" y="1.5" width="10" height="6.5" />
      <path d="M4 10.5h4M6 8v2.5" strokeLinecap="round" />
    </svg>
  );
}

// Contract: owner finding, 2026-08-31 (issue #368) — "I don't see the usage, for the theme to be
// hidden behind the account dropdown. Please put it outside." This component already existed
// (shell revamp phase 2, 2026-08-30) but was never wired into `apps/console`; the toggle had
// stayed inside `AccountMenu`'s own popup instead (ADR 0010 Decision 5), which is exactly what
// the finding is about. It is now the ONLY place the preference is edited: the visible
// quick-cycle in `ConsoleTopBar`'s right cluster beside `CommandPaletteTrigger` (`<md`; `AccountMenu`
// no longer renders there at all — owner ruling, 2026-08-31, issue #368: "We don't need a drop
// down for the connected user, since it's in the left rail" — `AccountMenu` itself is deleted),
// and its own row in `ConsoleSidebar`'s footer stack (`md`+, where there is no horizontal header
// row to share). Both instances read/write the SAME preference via the one `useConsoleTheme`
// instance in `apps/console`, so they can never disagree.
//
// Controlled, per the skill's "pure, callback-driven components" rule: no `localStorage`/DOM
// write happens in `ui-web` itself.
export function ThemeToggle({ preference, onPreferenceChange, className }: ThemeToggleProps) {
  const next = NEXT_PREFERENCE[preference];
  const label = `Theme: ${PREFERENCE_WORD[preference]} — switch to ${PREFERENCE_WORD[next]}`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => onPreferenceChange(next)}
      className={className}>
      <ThemeGlyph preference={preference} />
    </Button>
  );
}
