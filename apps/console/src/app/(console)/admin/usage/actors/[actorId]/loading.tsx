'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../../../i18n/client';

/**
 * `/admin/usage/actors/[actorId]` — the App Router `loading.tsx` Suspense fallback (the route
 * carries `export const dynamic = 'force-dynamic'`).
 *
 * **The title is generic, deliberately.** The actor's NAME comes from `resolveActorLabels`, which
 * runs client-side after the session and the panels resolve — a fallback rendered before any of
 * that cannot honestly name whose page this is, and printing the raw path id here would make the
 * page's title change twice while it loads. It draws the page's SHAPE instead — the real span
 * pattern of the nine panels — so the layout does not jump when the data lands.
 */
const PANEL_SPANS = [1, 1, 2, 1, 1, 1, 1, 1, 1];

export default function AdminUsageActorLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('usage.actor.fallback-title')} subtitle={t('usage.actor.loading')} />

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
