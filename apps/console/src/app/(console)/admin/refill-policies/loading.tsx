'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/refill-policies` centre loading skeleton. The route itself is `async`
 * (`readSession()` before the role gate), so this boundary also covers that real server-side
 * latency, not just the client chunk fetch.
 *
 * Matches the LIST mode's default (no-lookup-yet) geometry — the only mode a fresh navigation to
 * the bare path can land on — three cards: the lookup zone, the ladder, and the manual. Neither
 * of the mode params this route can also carry (`?create=`/`?edit=`/`?simulate=`) has a longer
 * server round-trip than the bare-path gate itself, so one shared skeleton covers all of them
 * honestly enough without hand-building three more.
 */
export default function AdminRefillPoliciesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Refill policies" subtitle="loading…" />

      <Card>
        <SkeletonMetric width={240} />
      </Card>

      <Card title="Your current ladder">
        <SkeletonMetric width={160} />
      </Card>

      <Card>
        <SkeletonMetric width={200} />
      </Card>
    </div>
  );
}
