import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { ShareBar } from '../../components/share-bar';
import { LABEL_CLASS, SUBJECT_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
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
      {/* `trailing`, not `actions`: the total is the other half of the label's sentence and sits
          on its baseline. Rendered only when there is a real figure to show — an `unwired` zone
          must never print a total, fabricated or zero, which is the whole point of the status. */}
      <ZoneHeading
        label={label}
        trailing={
          total && status === 'ready' ? <span className={SUBJECT_CLASS}>{total}</span> : undefined
        }
      />

      {status === 'error' ? (
        <div className="mt-4">
          <ErrorLine message={errorMessage ?? 'Failed to load spend share.'} onRetry={onRetry} />
        </div>
      ) : status === 'loading' ? (
        // Skeleton over the exact final geometry (console-ui skill "States"): the 8px bar, then
        // three list rows at the `ShareBar` row height. daisy `skeleton` is the raised fill and
        // the 2px radius — byte for byte what these blocks were spelling out — with its shimmer
        // already killed by the `@utility skeleton` override; only the heights are local.
        <div className="mt-4 flex flex-col gap-3">
          <div className="skeleton h-2" />
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton h-[28px]" />
            ))}
          </div>
          <p className={LABEL_CLASS}>Querying usage…</p>
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
          emptyMessage={
            status === 'unwired' ? (unwiredMessage ?? UNWIRED_CHART_MESSAGE) : undefined
          }
        />
      )}
    </div>
  );
}
