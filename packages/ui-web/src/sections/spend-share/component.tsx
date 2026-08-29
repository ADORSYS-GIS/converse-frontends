import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { ShareBar } from '../../components/share-bar';
import { DASHBOARD_LABEL_CLASS } from '../../lib/type-roles';
import { UNWIRED_CHART_MESSAGE } from '../unwired-chart-message';
import type { SpendShareSectionProps } from './types';

// Contract: owner brief 2026-08-24 -- "Spend — share by project," the part-to-whole view of the
// same per-project series `SpendDashboard` plots over time, placed directly below it. Follows
// `SpendDashboard`'s heading/status shape (`DASHBOARD_LABEL_CLASS` + `ready`/`loading`/`error`/
// `unwired`) so the two dashboards read as one family, uncontained on the floor.
//
// The mark is a `ShareBar`, not a donut (owner review 2026-08-29) — see that component's own
// docstring for why. The zone went from ~330px tall to ~90px in the process, which is most of
// what made Overview feel dense below the fold.
export function SpendShareSection({
  label = 'Spend — share by project',
  segments,
  total,
  status = 'ready',
  errorMessage,
  unwiredMessage,
  onRetry,
  selectedKey,
  onSelectSegment,
  formatPercent,
  className,
}: SpendShareSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <div className={DASHBOARD_LABEL_CLASS}>{label}</div>
        {/* Only when there is a real figure to show. An `unwired` zone must never print a total,
            fabricated or zero — that is the whole point of the status existing. */}
        {total && status === 'ready' ? (
          <span className="font-mono text-sm tabular-nums text-ink">{total}</span>
        ) : null}
      </div>

      {status === 'error' ? (
        <div className="mt-4">
          <ErrorLine message={errorMessage ?? 'Failed to load spend share.'} onRetry={onRetry} />
        </div>
      ) : status === 'loading' ? (
        // Skeleton over the exact final geometry (console-ui skill "States"): the 8px bar, then
        // three list rows at the `ShareBar` row height.
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-2 w-full rounded-[2px] bg-raised" />
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-[28px] w-full rounded-[2px] bg-raised" />
            ))}
          </div>
          <p className="text-subtle font-mono text-[11px]">Querying usage…</p>
        </div>
      ) : (
        <ShareBar
          className="mt-4"
          segments={segments}
          selectedKey={selectedKey}
          onSelectSegment={onSelectSegment}
          formatPercent={formatPercent}
          // Only overridden for `unwired` — see `SpendDashboard`'s equivalent comment. A zone
          // whose source was never queried says so; one that WAS queried and came back empty
          // keeps `ShareBar`'s own "No spend in this range."
          emptyMessage={status === 'unwired' ? (unwiredMessage ?? UNWIRED_CHART_MESSAGE) : undefined}
        />
      )}
    </div>
  );
}
