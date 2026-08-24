import React from 'react';

import { cn } from '../../cn';
import type { StatCardDelta, StatCardProps } from './types';

const DELTA_GLYPH: Record<StatCardDelta['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — `#191919` panel:
// 12px line glyph, `label`, `metric` numeral, delta line, and a right-hand `Sparkline` slot.
// Never tinted, never coloured by value. This is one of the two components allowed to
// self-panel (console-ui skill).
export function StatCard({ icon, label, metric, delta, sparkline, className }: StatCardProps) {
  return (
    <div className={cn('rounded-[2px] bg-surface p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          {icon ? (
            <span aria-hidden="true" className="text-subtle [&>svg]:h-3 [&>svg]:w-3">
              {icon}
            </span>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
            {label}
          </span>
        </div>
        {sparkline ? <div className="shrink-0 pt-1">{sparkline}</div> : null}
      </div>

      <div className="mt-3 font-mono text-[22px] leading-[1.2] text-ink">{metric}</div>

      {delta ? (
        <div
          className={cn(
            'mt-2 font-mono text-[10px]',
            delta.direction === 'flat' ? 'text-subtle' : 'text-soft',
          )}
        >
          <span aria-hidden="true">{DELTA_GLYPH[delta.direction]}</span> {delta.label}
        </div>
      ) : null}
    </div>
  );
}
