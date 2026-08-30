'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

/**
 * `/admin` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all (the App Router Suspense fallback shown while the incoming route segment's RSC
 * payload + client chunk are still in flight). The route itself is `async` (`readSession()`
 * before the role gate), so this boundary also covers that real server-side latency, not just the
 * client chunk fetch.
 *
 * Phase 6 (admin/settings revamp): matches `AdminCentre`'s actual geometry — `ReviewQueue` inside
 * a `Card`, no Pending/Decided tabs, no RECENT DECISIONS ledger below it.
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

      <Card>
        <ReviewQueue pending={[]} loading loadingRowCount={6} onSelectRequest={() => undefined} />
      </Card>
    </div>
  );
}
