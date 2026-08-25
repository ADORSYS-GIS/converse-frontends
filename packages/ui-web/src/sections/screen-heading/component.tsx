import React from 'react';

import { cn } from '../../cn';
import type { ScreenHeadingProps } from './types';

// Contract: docs/design/console-redesign/README.md §5 — every screen opens with the same title
// block: a 22px mono `ink` page title, an 11px Inter `subtle` subline, and two composition slots
// for the screen's own affordances (a compact-tier scope trigger beside the subline; the screen's
// primary action on the right). Sits directly on the floor — never in a card.
export function ScreenHeading({
  title,
  subline,
  sublineActions,
  actions,
  className,
}: ScreenHeadingProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="font-mono text-[22px] leading-[1.25] text-ink">{title}</h1>
        {subline || sublineActions ? (
          <div className="mt-1 flex items-center gap-1.5">
            {subline ? <p className="font-sans text-[11px] text-subtle">{subline}</p> : null}
            {sublineActions}
          </div>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
