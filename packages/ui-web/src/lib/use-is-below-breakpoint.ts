import { useEffect, useState } from 'react';

// Must track `tailwind.config.js`'s `screens` exactly (`md: 600`, `lg: 1024`).
const BELOW_MD = '(max-width: 599px)';
const BELOW_LG = '(max-width: 1023px)';

function readMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(query).matches;
}

// A narrow, deliberate exception to "CSS-driven tiers, not a JS tier prop" (console-ui skill
// "Shape and layout") — needed only where a third-party modal primitive has a real, JS-driven
// side effect that CSS cannot scope away.
//
// `BottomSheet` wraps Base UI's `Drawer`, and a modal drawer is modal for as long as it is `open`,
// full stop — unconditionally, regardless of the sheet's own CSS visibility (`lg:hidden` /
// `md:hidden` does nothing to stop it). Read off a live browser on 2026-08-29, the modality is
// three separate things: every other body-level element goes `aria-hidden`, `<body>` goes
// `overflow: hidden`, and — the one that actually freezes a page — `Drawer.Portal` renders
// Floating UI's `InternalBackdrop`, a `position: fixed; inset: 0` div that swallows every press.
//
// That last part is why the second CSS layer targets the PORTAL and not the backdrop and panel:
// hiding those two leaves the press-absorber on screen, so `document.elementFromPoint` at the top
// of the page still answers with it and the page is dead under a sheet nobody can see. This is
// not Radix's old `pointer-events: none` on `<body>` — `<body>` stays `auto` throughout, and the
// element is not marked `inert` either, both verified. Same outcome, different element.
//
// `Drawer.Root`'s `modal` prop is real and does honour `false` (vaul's never reached the dialog
// under it), but a non-modal sheet is a different component — no focus trap, no scroll lock — so
// it is not a fix for this.
//
// A sheet opened by clicking a `*:hidden` trigger button is safe by construction: a real
// `display:none` element cannot be clicked or focused, so the trigger simply cannot fire above
// its tier in an actual browser. Two cases are NOT safe, and are why this hook exists:
//
//  1. **A live resize past the breakpoint while the sheet is open** (window un-maximised, tablet
//     rotated): the sheet stays open in React state, its own CSS correctly hides it — and the
//     drawer keeps the page scroll-locked and `aria-hidden` behind a press-absorber, silently
//     freezing the whole app with no visible cause. Empirically confirmed in a real browser,
//     under vaul and again under Base UI.
//  2. **Selection-driven sheets** (`SelectionSheet`: Manage's SELECTION, Admin's review detail),
//     which a screen opens from a prop change with no gated trigger in between — the same
//     `onSelectRow` callback fires identically at every tier.
//
// Consumers therefore gate `open` itself (`open && isBelow…`), which is the only thing that stops
// the modality outright; the `*:hidden` class on the sheet's portal is a second, independent
// layer for the moment between a real breakpoint crossing and this hook's listener firing.
//
// Defaults to `true` (assume below the breakpoint) when `matchMedia` is unavailable (SSR, or a
// test environment without it) — the same mobile-first bias as the rest of the shell: content
// stays reachable by default, and callers that need to prove the desktop guard mock `matchMedia`
// explicitly (see this hook's own test).
function useIsBelow(query: string): boolean {
  const [isBelow, setIsBelow] = useState(() => readMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setIsBelow(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    // Belt-and-suspenders alongside the `change` listener above, not a replacement for it: a
    // plain `window.resize` re-check of `mql.matches` covers engines/automation contexts where a
    // CDP-driven viewport override (devtools protocol `Emulation.setDeviceMetricsOverride`,
    // exactly what browser-automation "resize the viewport" tooling uses) updates `matches`
    // itself correctly but does not dispatch the `MediaQueryList`'s own `change` event —
    // confirmed empirically against a real consumer (`SectionSheet`) in a live browser during
    // this feature's own build. A genuine user resizing an OS window fires both.
    window.addEventListener('resize', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, [query]);

  return isBelow;
}

/** True below the `lg` (1024) tier — where the right rail is not rendered at all. */
export function useIsBelowLg(): boolean {
  return useIsBelow(BELOW_LG);
}

/** True below the `md` (600) tier — where the left rail is not rendered at all. */
export function useIsBelowMd(): boolean {
  return useIsBelow(BELOW_MD);
}
