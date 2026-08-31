'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { RefillHistory } from '@lightbridge/ui-web/src/sections/refill-history';
import { RefillRequestForm } from '@lightbridge/ui-web/src/sections/refill-request-form';

/**
 * `/accounts/<id>/refill` centre loading skeleton — see `(console)/overview/loading.tsx`'s own
 * doc comment for why this file exists at all (the route carries `force-dynamic`, so a nav here
 * re-renders server-side with nothing to show while the payload is in flight).
 *
 * Both cards get their own `status: 'loading'` — the same contract `RefillCentre` drives from
 * `useRefillScreen()`'s real queries once mounted.
 */
export default function RefillLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Request a budget refill" subtitle="loading scope…" />

      <Card>
        <RefillRequestForm state={{ status: 'loading' }} />
      </Card>

      <Card>
        <RefillHistory state={{ status: 'loading' }} />
      </Card>
    </div>
  );
}
