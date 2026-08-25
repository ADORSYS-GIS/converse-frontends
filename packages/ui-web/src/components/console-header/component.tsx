import React from 'react';

import { cn } from '../../cn';
import type { ConsoleHeaderProps } from './types';

// Contract: docs/design/console-redesign/README.md §3/§4 `ConsoleHeader` — h56 `--chrome` bar;
// config-driven logo slot (falls back to a wordmark), org switcher, account menu. Pure slots —
// no data fetching, no routing.
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
    <header className={cn('flex h-14 items-center gap-4 bg-chrome px-5', className)}>
      <div className="flex items-center gap-3">
        {logoSrc ? (
          <img src={logoSrc} alt={logoAlt} className="h-5 w-5 rounded-[2px]" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-raised" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" className="text-subtle" />
            </svg>
          </span>
        )}
        <span className="font-mono text-xs tracking-[.14em] text-ink">{wordmark}</span>
      </div>

      {orgSwitcher ? (
        <>
          <span aria-hidden="true" className="h-6 w-px bg-border" />
          {orgSwitcher}
        </>
      ) : null}

      <div className="flex-1" />

      {paletteTrigger}
      {identity}
    </header>
  );
}
