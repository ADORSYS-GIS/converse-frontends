import React from 'react';

import { cn } from '../../cn';
import type { StatCardDelta, StatCardProps } from './types';
import { LABEL_CLASS, METRIC_CLASS } from '../../lib/type-roles';

const DELTA_GLYPH: Record<StatCardDelta['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};

// Deltas are direction + wording in greys, never green/red (ADR 0008). `flat` reads one step
// back because "no change" is the least newsworthy of the three.
const DELTA_TONE: Record<StatCardDelta['direction'], string> = {
  up: 'text-soft',
  down: 'text-soft',
  flat: 'text-subtle',
};

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — a panel carrying a
// 12px line glyph, `label`, `metric` numeral, delta line, and a right-hand `Sparkline` slot.
// Never tinted, never coloured by value. This is one of the two components allowed to self-panel
// (console-ui skill), which is why the panel fill and radius below are its own.
//
// NO UPSTREAM: PRIMITIVES.md rejects daisy `stat`/`stats` outright — it imposes its own padding,
// its own dividers and a horizontal grouping model, against a card that is mockup-locked at a
// tighter geometry. So the card's own geometry (the panel, the 4-8-12 spacing steps, the fixed
// 12px glyph box) is `stat-card` in theme.css, named part by part; both type roles are imported,
// and the only thing left in this file is the delta's variant map.
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
        <div className={cn('stat-card-delta', DELTA_TONE[delta.direction])}>
          <span aria-hidden="true">{DELTA_GLYPH[delta.direction]}</span> {delta.label}
        </div>
      ) : null}
    </div>
  );
}
