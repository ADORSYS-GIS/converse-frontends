'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { EstateBudgetPressure } from '@lightbridge/ui-web/src/sections/estate-budget-pressure';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../i18n/client';

/**
 * `/admin/overview` centre — the App Router `loading.tsx` Suspense fallback (the route carries
 * `export const dynamic = 'force-dynamic'`, same reasoning `accounts/[accountId]/overview/
 * loading.tsx`'s own doc comment states for its own route).
 *
 * **Generic panels, deliberately** (converse-frontends#447, story C4). This fallback used to name
 * each of the eight boards — its own labels, its own scales, its own row counts — which made it a
 * third place the page's composition was written down, and the one nobody would remember to update.
 * The panel list is `dashboards.yaml` data now, read server-side by `page.tsx`, so a fallback
 * rendered BEFORE that read cannot honestly know how many panels there are or what they are called.
 * It draws the page's SHAPE instead: the two RPC-backed zones (which are fixed, and are the only
 * things on this page a fallback can name truthfully) and a grid of neutral panel skeletons at the
 * real geometry, so the layout does not jump when the document lands.
 */
export default function AdminOverviewLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('overview.title')} subtitle={t('overview.loading')} />

      <DashboardGrid>
        <Card data-span="2">
          <EstateBudgetPressure accounts={[]} status="loading" />
        </Card>
        <div data-span="2">
          <OverviewStatRow cards={[]} loading />
        </div>
      </DashboardGrid>

      <DashboardGrid>
        {/* Two full-width panels then four half-width ones — the shape every entry of this page
            has had since the migration, without claiming to know their titles. */}
        {[2, 2, 1, 1, 1, 1].map((span, index) => (
          <Card key={index} data-span={span === 2 ? '2' : undefined}>
            <div className="skeleton h-4 w-48" />
            <SkeletonMetric />
          </Card>
        ))}
      </DashboardGrid>
    </div>
  );
}
