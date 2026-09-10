'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../i18n/client';

/**
 * `/admin/provision-account` loading skeleton (lightbridge-authz#720/#722). The route itself is
 * `async` (`readSession()` before the permission gate), so this boundary also covers that real
 * server-side latency, not just the client chunk fetch.
 *
 * Matches the form's own geometry — a single card holding the three fields (subject, email, name)
 * — the same shape `admin/refill-policies/create/loading.tsx` uses for its own single-card form.
 * Header copy goes through the `admin` namespace like the screen itself (ADR 0017).
 */
export default function AdminProvisionAccountLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('provision-account.title')} subtitle={t('provision-account.loading')} />

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
