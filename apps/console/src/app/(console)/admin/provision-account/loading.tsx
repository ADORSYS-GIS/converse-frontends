'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/provision-account` loading skeleton (lightbridge-authz#720/#722). The route itself is
 * `async` (`readSession()` before the role gate), so this boundary also covers that real
 * server-side latency, not just the client chunk fetch.
 *
 * Matches the form's own geometry — a single card holding the three fields (subject, email, name)
 * — the same shape `admin/refill-policies/create/loading.tsx` uses for its own single-card form.
 */
export default function AdminProvisionAccountLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Provision account" subtitle="loading…" />

      <Card>
        <SkeletonMetric width={220} />
        <div className="mt-6">
          <SkeletonMetric width={220} />
        </div>
        <div className="mt-6">
          <SkeletonMetric width={220} />
        </div>
      </Card>
    </div>
  );
}
