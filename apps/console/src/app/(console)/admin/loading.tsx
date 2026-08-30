'use client';

import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

/**
 * `/admin` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all (the App Router Suspense fallback shown while the incoming route segment's RSC
 * payload + client chunk are still in flight). The route itself is `async` (`readSession()`
 * before the role gate), so this boundary also covers that real server-side latency, not just the
 * client chunk fetch.
 *
 * Shell revamp phase 4 (2026-08-30): `/admin` is now ONE screen — the budget refill review queue
 * — not a dashboard-or-queue switch, so this skeleton matches `AdminCentre`'s actual geometry
 * (`ReviewQueue` with no rows) rather than the deleted admin-overview dashboard shape the previous
 * version of this file skeletoned.
 *
 * `ReviewQueue`'s own `loading` skeleton (console-ui skill §states: `raised` blocks matching the
 * final row geometry) is what actually renders here — this file's only job is to drive it with
 * empty data, the same contract `AdminCentre` uses while `useAdminScreen()`'s own query is in
 * flight.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Budget refill review" subtitle="loading queue…" />

      <ReviewQueue
        activeTab="pending"
        onTabChange={() => undefined}
        pendingCount={0}
        decidedCount={0}
        pending={[]}
        loading
        loadingRowCount={6}
        onSelectRequest={() => undefined}
      />
    </div>
  );
}
