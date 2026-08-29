import React from 'react';

import { cn } from '../../cn';
import type { ConsoleHeaderProps } from './types';

// Contract: docs/design/console-redesign/README.md §3/§4 `ConsoleHeader` — h56 `--chrome` bar;
// config-driven logo slot (falls back to a wordmark), org switcher, account menu. Pure slots —
// no data fetching, no routing.
//
// NO UPSTREAM: daisy `navbar` is not in the adopted set (it is a padded, min-height flex bar with
// its own start/center/end slot model, and the console's header is a fixed 56px chrome band
// whose height both rails stick to). The behaviour that IS here arrives through the slots: the
// caller passes Base UI-driven `orgSwitcher`/`identity`/`paletteTrigger`, so this file owns the
// band and nothing else — and the band, its logo box, its wordmark and its divider are four
// named classes in `theme.css` rather than eighteen utilities spread over five elements. The band
// also sets `--focus-gap`, so every focusable slot the caller passes in gets a focus ring whose
// 1px gap is the header's own colour instead of the floor's.
//
// BASE UI `toolbar` WAS CONSIDERED AND REFUSED (2026-08-30). "A logo, a switcher, a palette
// trigger and an account menu" is arguably a toolbar, so the claim was tested against the shipped
// 1.7.0 source and against rendered output, not against the description. Two findings, either of
// which is disqualifying:
//
//  1. `ToolbarRoot` puts `role="toolbar"` on the element it renders, unconditionally
//     (`toolbar/root/ToolbarRoot.js` — `defaultProps = { 'aria-orientation', role: 'toolbar' }`).
//     This `<header>` is a direct child of `ConsoleShell`'s `shell-chrome-stack`, outside `<main>`
//     and any sectioning element, so it is the page's `banner` landmark. An explicit `role`
//     replaces the implicit one: adopting `toolbar` here trades the console's only banner landmark
//     for a widget role. Losing a landmark to gain a meter is not a trade worth making.
//
//  2. The roving focus a toolbar exists to provide would not arrive anyway. `ToolbarRoot` is a
//     `CompositeRoot`, and only children registered as `CompositeItem`s — `Toolbar.Button` /
//     `Toolbar.Link` / `Toolbar.Input` — join its ring. Rendered with ordinary children, it emits
//     `role="toolbar"` while every child keeps its native `tabindex` and the arrow keys do
//     nothing: a toolbar that announces itself and manages no controls. Measured both ways —
//     ordinary `<button>` children came out `tabindex` 0/0; real `Toolbar.Button`s came out 0/-1.
//     This component is a PURE SLOT HOST by contract, and the slots are opaque: `apps/console`'s
//     `identity` is a `<div>` carrying an `InlineStatus`, a `ThemeToggle` AND an `AccountMenu`.
//     Making the toolbar real would mean wrapping each slot in `Toolbar.Button render={slot}` —
//     inverting the slot contract, and putting a roving `tabindex` on a `<div>` that wraps two
//     buttons. And the payoff would be collapsing four header tab stops into one, which is the
//     wrong direction for a banner.
//
// So `toolbar` is not a gap here; it is the wrong primitive. scripts/base-ui-adoption.ts records
// it as a reasoned `null` rather than leaving a debt entry implying we still mean to adopt it.
export function ConsoleHeader({
  logoSrc,
  logoAlt = 'Lightbridge',
  wordmark = 'LIGHTBRIDGE',
  orgSwitcher,
  paletteTrigger,
  identity,
  className,
}: ConsoleHeaderProps) {
  return (
    <header className={cn('console-header', className)}>
      <div className="header-brand">
        {logoSrc ? (
          <img src={logoSrc} alt={logoAlt} className="header-logo" />
        ) : (
          <span className="header-logo" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
            </svg>
          </span>
        )}
        <span className="header-wordmark">{wordmark}</span>
      </div>

      {orgSwitcher ? (
        <>
          <span aria-hidden="true" className="header-rule" />
          {orgSwitcher}
        </>
      ) : null}

      <div className="flex-1" />

      {paletteTrigger}
      {identity}
    </header>
  );
}
