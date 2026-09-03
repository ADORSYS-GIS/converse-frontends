import React from 'react';

import { cn } from '../../cn';
import { SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { CardProps } from './types';

// The console visual revamp's one generic panel (phase 1 foundation brief, 2026-08 — supersedes
// the console-ui skill's "never a card" rule for this component specifically): a two-column
// console modelled on Anthropic Console / fal.ai / Attio, where stats/charts/tables/forms sit
// inside cards. Paint is `console-card` (theme.css) — a `base-200` surface, a hairline border at
// the new `--radius-box` step, and a 1.25rem inset — plus the optional `.card-head` row it hooks
// for a title/actions line.
//
// Bespoke: a padded panel with no interactive state of its own has nothing for Base UI to own
// (`scripts/base-ui-adoption.ts` records the `null`).
export function Card({ title, actions, children, className, ref, ...rest }: CardProps) {
  const hasHead = Boolean(title || actions);
  return (
    <section ref={ref} className={cn('console-card', className)} {...rest}>
      {hasHead ? (
        <div className="card-head">
          {title ? <h2 className={SECTION_TITLE_CLASS}>{title}</h2> : null}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
