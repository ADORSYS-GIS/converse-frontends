import React from 'react';

import { cn } from '../../cn';
import { DELTA_GLYPH, statCardDeltaVariants } from './cva';
import type { StatCardProps } from './types';
import { LABEL_CLASS, METRIC_CLASS } from '../../lib/type-roles';

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — a panel carrying a
// 12px line glyph, `label`, `metric` numeral, delta line, and a right-hand `Sparkline` slot.
// Never tinted, never coloured by value. This is one of the two components allowed to self-panel
// (console-ui skill), which is why the panel fill and radius below are its own.
//
// NO UPSTREAM: PRIMITIVES.md rejects daisy `stat`/`stats` outright — it imposes its own padding,
// its own dividers and a horizontal grouping model, against a card that is mockup-locked at a
// tighter geometry. So the card's own geometry (the panel, the 4-8-12 spacing steps, the fixed
// 12px glyph box) is declared part by part in theme.css, under the block the JSX below names;
// both type roles are imported, and the delta's tone axis is cva.ts.
export function StatCard({ icon, label, metric, delta, sparkline, className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="stat-card-head">
        <div>
          {icon ? (
            <span aria-hidden="true" className="stat-card-icon">
              {icon}
            </span>
          ) : null}
          <span className={LABEL_CLASS}>{label}</span>
        </div>
        {sparkline ? <div className="stat-card-spark">{sparkline}</div> : null}
      </div>

      <div className={cn(METRIC_CLASS, 'stat-card-metric')}>{metric}</div>

      {delta ? (
        <div className={statCardDeltaVariants({ direction: delta.direction })}>
          <span aria-hidden="true">{DELTA_GLYPH[delta.direction]}</span> {delta.label}
        </div>
      ) : null}
    </div>
  );
}
