'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../i18n/client';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

/**
 * `/admin/refills-queue` centre loading skeleton (moved here from `/settings/refills-queue` — see
 * `admin/refills-queue/page.tsx`'s own doc comment for the route's two moves). The route itself is
 * `async` (`readSession()` before the role gate), so this boundary also covers that real
 * server-side latency, not just the client chunk fetch.
 *
 * Matches `RefillsQueueCentre`'s actual geometry — `ReviewQueue` inside a `Card`, no
 * Pending/Decided tabs, no RECENT DECISIONS ledger below it.
 *
 * `ReviewQueue`'s own `loading` skeleton (console-ui skill §states: `raised` blocks matching the
 * final row geometry) is what actually renders here — this file's only job is to drive it with
 * empty data, the same contract `RefillsQueueCentre` uses while `useRefillsQueueScreen()`'s own
 * query is in flight.
 */
export default function RefillsQueueLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('refills-queue.title')} subtitle={t('refills-queue.loading')} />

      <Card>
        <ReviewQueue pending={[]} loading loadingRowCount={6} onSelectRequest={() => undefined} />
      </Card>
    </div>
  );
}
