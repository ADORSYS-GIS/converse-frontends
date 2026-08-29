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
