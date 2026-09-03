'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { RESET_SCHEDULE_ENFORCEMENT_CAPTION } from '@lightbridge/ui-web/src/lib/reset-schedule';

import { useTranslation } from '../../../../i18n/client';

/**
 * `/admin/budget-schedules` centre loading skeleton. The route itself is `async` (`readSession()`
 * before the role gate), so this boundary also covers that real server-side latency, not just the
 * client chunk fetch.
 *
 * The enforcement caption renders HERE too, in full. It is not a loaded fact — it is what this
 * screen is for and what it is not, and a reader who lands during the fetch should have it before
 * the first row appears, not after.
 */
export default function AdminBudgetSchedulesLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('budget-schedules.title')}
        subtitle={RESET_SCHEDULE_ENFORCEMENT_CAPTION}
      />

      <Card>
        <SkeletonMetric width={280} />
      </Card>
    </div>
  );
}
