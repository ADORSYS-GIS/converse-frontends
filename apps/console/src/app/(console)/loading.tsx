'use client';

import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { LatencyDashboard } from '@lightbridge/ui-web/src/sections/latency-dashboard';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { LATENCY_BLOCKED_MESSAGE } from '../../containers/use-overview-screen';

/**
 * `/` centre — the App Router `loading.tsx` Suspense fallback shown while the incoming route
 * segment's RSC payload + client chunk are still in flight.
 *
 * Before this file existed, the `(console)` route group had NO loading boundary anywhere: the
 * `children`/`@rail`/`@scope` segments all carry `export const dynamic = 'force-dynamic'`
 * (`(console)/page.tsx`), so every navigation re-renders them server-side with nothing to show in
 * the meantime — an empty floor (pure `bg-muted` black in the default theme) until the payload
 * lands, very visible in dev where compilation adds real latency. This is the skeleton that fills
 * that gap, one-to-one with `OverviewCentre`'s real geometry.
 *
 * Every section below already carries its own `loading`/`status="loading"` skeleton rendering
 * (console-ui skill §states) — this file's only job is to drive those flags with empty data, the
 * same contract `OverviewCentre` uses while `useOverviewScreen()`'s own queries are in flight.
 * `LATENCY_BLOCKED_MESSAGE` is imported rather than restated: it is shown unconditionally by the
 * real screen too (LATENCY is permanently blocked on the documented contract, #307), so it is not
 * a "loading" fabrication — it is literally the same line the hydrated page renders next.
 *
 * `BudgetPanel` gets `status: 'loading'`, not a `value: 0, ceiling: 0` numeral — a Suspense
 * fallback is exactly the "queried, waiting" fact `BudgetHeroLoadingProps` exists for (#306); the
 * pre-#306 version of this file rendered a fabricated `$0.00 of $0.00` here, the same defect #273
 * fixed on the hydrated page but missed on this loading boundary.
 */
export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Overview" subline="loading scope…" />

      <InlineStatus>{LATENCY_BLOCKED_MESSAGE}</InlineStatus>

      <OverviewStatRow cards={[]} loading />

      <SpendDashboard series={[]} fallbackWidth={840} height={220} status="loading" />

      <SpendShareSection segments={[]} status="loading" />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <LatencyDashboard
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          series={[]}
          fallbackWidth={840}
          height={200}
          status="loading"
        />
        <BudgetPanel
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
          budget={{ status: 'loading' }}
        />
      </div>
    </div>
  );
}
