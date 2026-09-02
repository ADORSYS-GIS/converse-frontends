import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/usage/channels/[channelId]` — the App Router `loading.tsx` Suspense fallback.
 *
 * Generic panels, the same reason `/admin/usage`'s fallback gives: the panel list is
 * `dashboards.yaml` data, read server-side by `page.tsx`, so a fallback rendered BEFORE that read
 * cannot honestly name the panels. It draws the seven-panel span pattern so the layout does not
 * jump when the document lands.
 */
const PANEL_SPANS = [1, 1, 2, 1, 1, 1, 2];

export default function AdminUsageChannelLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Channel" subtitle="loading this client’s usage…" />

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
