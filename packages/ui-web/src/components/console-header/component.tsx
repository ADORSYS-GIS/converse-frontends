import React from 'react';

import { cn } from '../../cn';
import type { ConsoleHeaderProps } from './types';

// The logo box — 20px square at the console's 2px radius, identical whether it holds the
// configured image or the fallback mark, so swapping one for the other never nudges the row.
const LOGO_BOX_CLASS = 'h-5 w-5 rounded-[2px]';

// Contract: docs/design/console-redesign/README.md §3/§4 `ConsoleHeader` — h56 `--chrome` bar;
// config-driven logo slot (falls back to a wordmark), org switcher, account menu. Pure slots —
// no data fetching, no routing.
//
// NO UPSTREAM: daisy `navbar` is not in the adopted set (it is a padded, min-height flex bar with
// its own start/center/end slot model, and the console's header is a fixed 56px chrome band
// whose height both rails stick to). The behaviour that IS here arrives through the slots: the
// caller passes Base UI-driven `orgSwitcher`/`identity`/`paletteTrigger`, so this file owns the
// band and nothing else.
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
    // h-14 is 56px — the number ConsoleShell's sticky rails offset themselves by.
    <header className={cn('bg-chrome flex h-14 items-center gap-4 px-5', className)}>
      <div className="flex items-center gap-3">
        {logoSrc ? (
          <img src={logoSrc} alt={logoAlt} className={LOGO_BOX_CLASS} />
        ) : (
          <span
            className={cn(LOGO_BOX_CLASS, 'bg-raised flex items-center justify-center')}
            aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1 9 L5 1 L9 9 Z"
                fill="none"
                stroke="currentColor"
                className="text-subtle"
              />
            </svg>
          </span>
        )}
        {/* The wordmark is a brand mark, not a `label` — the skill's ban on uppercase applies to
            labels, and the tracking exists to make the caps legible at 12px. */}
        <span className="text-ink font-mono text-xs tracking-[.14em]">{wordmark}</span>
      </div>

      {orgSwitcher ? (
        <>
          {/* The one place a `border` stroke is right outside a form control: a vertical rule
              separating two identity affordances inside a single band. */}
          <span aria-hidden="true" className="bg-border h-6 w-px" />
          {orgSwitcher}
        </>
      ) : null}

      <div className="flex-1" />

      {paletteTrigger}
      {identity}
    </header>
  );
}
