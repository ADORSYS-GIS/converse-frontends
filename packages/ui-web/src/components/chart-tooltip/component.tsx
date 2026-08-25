import React from 'react';
import { FloatingPortal } from '@floating-ui/react';

import type { ChartTooltipProps } from './types';

/**
 * Presentational tooltip card, positioned over a chart at a data point. Purely
 * presentational by design: which point is "active" is each chart primitive's own
 * state, passed down as `rows`/`title`; *where* the card sits is each chart's own
 * `useChartTooltipFloating()` call, passed down as `setFloating`/`floatingStyles`/
 * `getFloatingProps` (ADR 0010 Phase 3 rewrite -- see that hook's docstring for why the
 * Floating UI wiring lives one level up, in the component that renders the interactive
 * hit-region elements a pointer/tap/keyboard focus actually lands on, rather than here).
 *
 * DOM port of packages/ui's `chart-tooltip` (RN `View`/`Text` ->
 * `<div>`/`<span>`), still using the console-ui token set (`bg-surface`,
 * `text-ink`, `text-subtle`).
 */
export function ChartTooltip({
  visible,
  title,
  rows,
  setFloating,
  floatingStyles,
  getFloatingProps,
}: ChartTooltipProps) {
  const open = visible && rows.length > 0;

  if (!open) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={{ ...floatingStyles, pointerEvents: 'none' }}
        {...getFloatingProps()}
        className="flex max-w-[240px] flex-col gap-1 rounded-[2px] bg-surface px-2.5 py-2 font-mono">
        {title ? <span className="truncate text-[11px] text-subtle">{title}</span> : null}
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-1.5">
            {row.color ? (
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="flex-1 truncate text-xs text-ink">{row.label}</span>
            <span className="text-xs tabular-nums text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </FloatingPortal>
  );
}
