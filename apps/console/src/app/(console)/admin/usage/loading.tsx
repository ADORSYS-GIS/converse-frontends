import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/usage` centre — the App Router `loading.tsx` Suspense fallback (the route carries
 * `export const dynamic = 'force-dynamic'`).
 *
 * **Generic panels, deliberately**, for the same reason `/admin/overview`'s fallback is: the panel
 * list is `dashboards.yaml` data, read server-side by `page.tsx`, so a fallback rendered BEFORE
 * that read cannot honestly know how many panels there are or what they are called. Naming them
 * would make this a second place the page's composition was written down, and the one nobody would
 * remember to update. It draws the page's SHAPE instead — the real span pattern of the nineteen
 * panels — so the layout does not jump when the document lands.
 */
const PANEL_SPANS = [1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2];

export default function AdminUsageLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usage" subtitle="loading estate usage…" />

      <DashboardGrid>
        {PANEL_SPANS.map((span, index) => (
          <Card key={index} data-span={span === 2 ? '2' : undefined}>
            <div className="skeleton h-4 w-48" />
            <SkeletonMetric />
          </Card>
        ))}
      </DashboardGrid>
    </div>
  );
}
