'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/refill-policies/create` loading skeleton (owner review round 2, 2026-08-31,
 * converse-frontends#368 finding #4 — create's own route, split off `/admin/refill-policies`'s
 * shared list-mode skeleton). The route itself is `async` (`readSession()` before the role gate),
 * so this boundary also covers that real server-side latency, not just the client chunk fetch.
 *
 * Matches the form's own geometry — a single card holding the policy set id field and the rule
 * set form below it — rather than reusing the list route's three-card skeleton, which shows the
 * wrong shape for a screen with no lookup/ladder/manual zones at all.
 */
export default function AdminRefillPolicyCreateLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New refill policy" subtitle="loading…" />

      <Card>
        <SkeletonMetric width={200} />
        <div className="mt-6">
          <SkeletonMetric width={320} />
        </div>
      </Card>
    </div>
  );
}
