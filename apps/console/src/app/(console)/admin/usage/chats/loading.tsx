import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/admin/usage/chats` — the App Router `loading.tsx` Suspense fallback.
 *
 * Generic panels drawn at the real five-panel span pattern, for the same reason every other
 * dashboard fallback in this area is generic: naming them here would be a second place the page's
 * composition was written down, and the one nobody would remember to update.
 */
const PANEL_SPANS = [2, 2, 1, 1, 2];

export default function AdminUsageChatsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Chats" subtitle="loading chat traffic…" />

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
