'use client';

import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { BudgetPressure } from '@lightbridge/ui-web/src/sections/budget-pressure';
import { LatencyDashboard } from '@lightbridge/ui-web/src/sections/latency-dashboard';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

/**
 * `/admin` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all. The route itself is `async` (`readSession()` before the role gate), so this
 * boundary also covers that real server-side latency, not just the client chunk fetch.
 *
 * It matches the LANDING section's geometry, which is now the admin OVERVIEW rather than the
 * refill queue: a `loading.tsx` is a Suspense fallback for the segment, and the segment cannot
 * read `?section=` before it resolves, so it has to skeleton one of the two. The default section
 * (`url-state.ts`'s `adminParsers.section`) is the only defensible choice — it is what a bare
 * `/admin` opens, and it is by far the more common entry. Arriving straight at
 * `?section=refills` briefly shows this shape instead of the queue's; `ReviewQueue`'s own
 * `loading` skeleton then takes over the moment the client component mounts.
 *
 * Every section below already carries its own `loading`/`status="loading"` rendering (console-ui
 * skill §states) — this file only drives those flags with empty data. No fabricated numerals:
 * `BudgetPanel` gets `status: 'loading'`, and `BudgetPressure` a `null` ceiling with loading rows,
 * never a `$0.00 of $0.00`.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Admin overview" subline="loading account…" />

      <OverviewStatRow cards={[]} loading />

      <SpendDashboard
        label="Spend — every project in this account"
        series={[]}
        fallbackWidth={840}
        height={220}
        status="loading"
      />

      <SpendShareSection segments={[]} status="loading" />

      <LatencyDashboard series={[]} fallbackWidth={840} height={310} status="loading" />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <BudgetPressure
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          projects={[]}
          ceiling={null}
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
