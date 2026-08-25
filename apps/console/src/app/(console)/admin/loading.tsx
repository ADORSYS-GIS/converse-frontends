'use client';

import { SkeletonRow } from '@lightbridge/ui-web/src/components/skeleton-row';
import { SECTION_LABEL } from '@lightbridge/ui-web/src/sections/dashboard-label';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

const noop = () => {};

/**
 * `/admin` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all. The route itself is `async` (`readSession()` before the role gate), so this
 * boundary also covers that real server-side latency, not just the client chunk fetch.
 *
 * `ReviewQueue` already renders its own row-skeleton geometry when `loading` is set. `DecisionsLedger`
 * (the "RECENT DECISIONS" tail below it) has no `loading` prop of its own — nothing in
 * `AdminCentre`'s real usage wires one either, decisions and the pending queue share one query —
 * so this composes the same `SkeletonRow` primitive `LedgerTable`'s own loading state uses
 * directly, under an identical `SECTION_LABEL` heading, rather than adding a prop no live caller
 * would ever set.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeading title="Budget refill review" subline="loading queue…" />

      <ReviewQueue
        activeTab="pending"
        onTabChange={noop}
        pendingCount={0}
        decidedCount={0}
        pending={[]}
        loading
        loadingRowCount={6}
        onSelectRequest={noop}
      />

      <div className="flex flex-col gap-2">
        <span className={SECTION_LABEL}>RECENT DECISIONS</span>
        <div role="presentation" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonRow key={index} columnCount={6} />
          ))}
        </div>
      </div>
    </div>
  );
}
