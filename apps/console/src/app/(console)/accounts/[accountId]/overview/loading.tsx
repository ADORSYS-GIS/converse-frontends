import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/accounts/[accountId]/overview` — the App Router `loading.tsx` Suspense fallback shown while the
 * incoming route segment's RSC payload and client chunk are still in flight. The route carries
 * `export const dynamic = 'force-dynamic'`, so every navigation re-renders it server-side with
 * nothing to show in the meantime; this is the skeleton that fills that gap rather than an empty
 * floor.
 *
 * **Generic panel skeletons, deliberately** (converse-frontends#455, story C12). This fallback used
 * to name each of the five zones — its own labels, its own geometry — which made it a third place
 * the page's composition was written down, and the one nobody would remember to update. The panel
 * list is `dashboards.yaml` data now, read server-side by `page.tsx`, so a fallback rendered BEFORE
 * that read cannot honestly know how many panels there are or what they are called (a deployment
 * can add one through the config volume). It draws the page's SHAPE instead: the two fixed,
 * hand-written zones — which are the only things here a fallback can name truthfully — and a grid
 * of neutral panel skeletons at the real geometry, so the layout does not jump when the document
 * lands. `/admin/overview`'s own fallback states the same reasoning.
 *
 * `BudgetPanel` gets `status: 'loading'`, never a `value: 0, ceiling: 0` numeral — a Suspense
 * fallback is exactly the "queried, waiting" fact `BudgetHeroLoadingProps` exists for.
 */
export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" subtitle="loading scope…" />

      <DashboardGrid>
        <div data-span="2">
          <OverviewStatRow cards={[]} loading />
        </div>
        <Card data-span="2">
          <BudgetPanel className="w-full" label="Budget" budget={{ status: 'loading' }} />
        </Card>
      </DashboardGrid>

      <DashboardGrid>
        {/* Two half-width stats, a full-width chart, then the breakdowns and the FOUR rings —
            the shape this page entry has, without claiming to know their titles. */}
        {[1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1].map((span, index) => (
          <Card key={index} data-span={span === 2 ? '2' : undefined}>
            <div className="skeleton h-4 w-48" />
            <SkeletonMetric />
          </Card>
        ))}
      </DashboardGrid>
    </div>
  );
}
