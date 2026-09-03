'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../../i18n/client';

/**
 * `/admin/budget-schedules/create` loading skeleton — its own boundary, matching the form's single
 * card rather than reusing the list route's table skeleton, which shows the wrong shape for a
 * screen with no rows at all. The route is `async` (`readSession()` before the role gate), so this
 * also covers that server-side latency.
 */
export default function AdminBudgetScheduleCreateLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('budget-schedules.create-title')}
        subtitle={t('budget-schedules.create-loading')}
      />

      <Card>
        <SkeletonMetric width={200} />
        <div className="mt-6">
          <SkeletonMetric width={320} />
        </div>
      </Card>
    </div>
  );
}
