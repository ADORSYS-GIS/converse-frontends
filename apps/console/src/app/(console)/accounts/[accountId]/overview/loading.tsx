'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

/**
 * `/` centre — the App Router `loading.tsx` Suspense fallback shown while the incoming route
 * segment's RSC payload + client chunk are still in flight.
 *
 * Before this file existed, the `(console)` route group had NO loading boundary anywhere: the
 * route carries `export const dynamic = 'force-dynamic'` (`(console)/page.tsx`), so every
 * navigation re-renders it server-side with nothing to show in the meantime — an empty floor
 * (pure `bg-muted` black in the default theme) until the payload lands, very visible in dev where
 * compilation adds real latency. This is the skeleton that fills that gap.
 *
 * Shell revamp phase 4 (2026-08-30), extended by phase 9.2: matches the ROLE-AGNOSTIC part of
 * `OverviewCentre`'s geometry — the money-first stat row, then SPEND OVER TIME → SPEND BY PROJECT
 * → SPEND BY MODEL → BUDGET, each in its own `Card` — which is what every signed-in user (admin or
 * not) sees. The admin-only cards below BUDGET are deliberately NOT skeletoned here: this boundary
 * resolves before the session (and therefore `session.isAdmin`) is known client-side, so it can
 * only honestly skeleton the part of the screen that renders unconditionally — the same reasoning
 * `settings/refills-queue/loading.tsx` uses to skeleton that route's one section rather than
 * guessing.
 *
 * Every section below already carries its own `loading`/`status="loading"` skeleton rendering
 * (console-ui skill §states) — this file's only job is to drive those flags with empty data, the
 * same contract `OverviewCentre` uses while `useOverviewScreen()`'s own queries are in flight.
 *
 * `BudgetPanel` gets `status: 'loading'`, not a `value: 0, ceiling: 0` numeral — a Suspense
 * fallback is exactly the "queried, waiting" fact `BudgetHeroLoadingProps` exists for (#306); the
 * pre-#306 version of this file rendered a fabricated `$0.00 of $0.00` here, the same defect #273
 * fixed on the hydrated page but missed on this loading boundary.
 */
export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" subtitle="loading scope…" />

      <OverviewStatRow cards={[]} loading />

      <Card>
        <SpendDashboard
          label="Spend over time"
          series={[]}
          fallbackWidth={840}
          height={220}
          status="loading"
        />
      </Card>

      <Card>
        <SpendShareSection label="Spend by project" segments={[]} status="loading" />
      </Card>

      <Card>
        <SpendShareSection label="Spend by model" segments={[]} status="loading" />
      </Card>

      <Card>
        <BudgetPanel label="Budget" budget={{ status: 'loading' }} />
      </Card>
    </div>
  );
}
