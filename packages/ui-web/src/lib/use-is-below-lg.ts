import { useEffect, useState } from 'react';

// Must track `tailwind.config.js`'s `screens.lg` (1024px) exactly.
const QUERY = '(max-width: 1023px)';

function readMatches(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(QUERY).matches;
}

// A narrow, deliberate exception to "CSS-driven tiers, not a JS tier prop" (console-ui skill
// "Shape and layout") — needed only where a third-party modal primitive has a real, JS-driven
// side effect that CSS cannot scope away.
//
// `SectionSheet` wraps vaul's `Drawer`, which wraps Radix's `Dialog.Root` — and vaul never
// forwards its own `modal` prop to that underlying primitive (confirmed by reading vaul's `Root`
// implementation; see `SectionSheet`'s own docstring for the equivalent note on the old peek
// mode). Radix's `Dialog.Root` therefore always runs as `modal: true` regardless of what a
// caller passes: on `open`, it calls `hideOthers()`, marking every other body-level element
// `aria-hidden` and freezing `pointer-events` on `<body>` — unconditionally, regardless of the
// dialog's own CSS visibility (`lg:hidden` does nothing to stop it).
//
// A `SectionSheet` opened by clicking its own `lg:hidden` trigger button is safe by
// construction: a real `display:none` element cannot be clicked or focused, so the trigger
// simply cannot fire at `lg` in an actual browser. But a *selection-driven* sheet — one a page
// opens itself from a prop change with no gated trigger in between (Manage's SELECTION, Admin's
// review detail) — has no such guard: the same `onSelectRow`/`onSelectRequest` callback fires
// identically at every tier, since there is only one ledger table. Without this hook, selecting
// a row at `lg` would silently open an invisible-but-fully-modal dialog and freeze the rest of
// the page for assistive tech (and, briefly, for the mouse too).
//
// Defaults to `true` (assume below `lg`) when `matchMedia` is unavailable (SSR, or a test
// environment without it) — the same mobile-first bias as the rest of the shell: content stays
// reachable by default, and callers that need to prove the `lg` guard mock `matchMedia`
// explicitly (see this hook's own test).
export function useIsBelowLg(): boolean {
  const [isBelowLg, setIsBelowLg] = useState(readMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsBelowLg(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    // Belt-and-suspenders alongside the `change` listener above, not a replacement for it: a
    // plain `window.resize` re-check of `mql.matches` covers engines/automation contexts where a
    // CDP-driven viewport override (devtools protocol `Emulation.setDeviceMetricsOverride`,
    // exactly what browser-automation "resize the viewport" tooling uses) updates `matches`
    // itself correctly but does not dispatch the `MediaQueryList`'s own `change` event —
    // confirmed empirically against this hook's real consumer (`SectionSheet`) in a live browser
    // during this feature's own build. A genuine user resizing an OS window fires both.
    window.addEventListener('resize', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return isBelowLg;
}
