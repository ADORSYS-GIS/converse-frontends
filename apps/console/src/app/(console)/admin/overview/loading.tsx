'use client';

import { ShareBar } from '@lightbridge/ui-web/src/components/share-bar';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import { EstateBudgetPressure } from '@lightbridge/ui-web/src/sections/estate-budget-pressure';
import { MultiSeriesSpendBoard } from '@lightbridge/ui-web/src/sections/multi-series-spend-board';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { TopSpendersLedger } from '@lightbridge/ui-web/src/sections/top-spenders-ledger';

const NO_OP = () => undefined;

/**
 * `/admin/overview` centre — the App Router `loading.tsx` Suspense fallback (route carries
 * `export const dynamic = 'force-dynamic'`, same reasoning `accounts/[accountId]/overview/
 * loading.tsx`'s own doc comment states for its own route). Matches `AdminOverviewCentre`'s real
 * geometry — no `Card` anywhere (this page's own "charts and tables render on the floor" ruling,
 * see that file's doc comment) — with every section driven by its own `loading`/`status="loading"`
 * skeleton rendering (console-ui skill §states). `LatencyStatCards` carries no loading prop of its
 * own (same gap `settings-overview-centre.tsx`'s latency zone already works around), so that one
 * zone renders plain `skeleton` blocks instead.
 */
export default function AdminOverviewLoading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" subtitle="loading estate…" />

      <MultiSeriesSpendBoard
        label="Total spend vs previous period"
        series={[]}
        scale="linear"
        onScaleChange={NO_OP}
        status="loading"
        fallbackWidth={1120}
        height={200}
      />
      <MultiSeriesSpendBoard
        label="Spend by account"
        series={[]}
        scale="linear"
        onScaleChange={NO_OP}
        status="loading"
        fallbackWidth={1120}
        height={220}
      />

      <div>
        <ZoneHeading label="Spend by model — estate share" />
        <ShareBar className="mt-4" segments={[]} />
      </div>
      <MultiSeriesSpendBoard
        label="Spend by model over time"
        series={[]}
        scale="log"
        onScaleChange={NO_OP}
        status="loading"
        fallbackWidth={1120}
        height={220}
      />

      <div>
        <ZoneHeading label="Top spenders" />
        <TopSpendersLedger className="mt-4" rows={[]} loading loadingRowCount={8} />
      </div>

      <EstateBudgetPressure accounts={[]} status="loading" />

      <OverviewStatRow cards={[]} loading />

      <MultiSeriesSpendBoard
        label="Request volume"
        series={[]}
        scale="indexed"
        onScaleChange={NO_OP}
        status="loading"
        fallbackWidth={1120}
        height={200}
      />

      <div>
        <ZoneHeading label="Latency by model" />
        <div className="mt-4 flex flex-col gap-1">
          {Array.from({ length: 4 }, (_, row) => (
            <div key={row} className="skeleton h-[28px]" />
          ))}
        </div>
      </div>

      <OverviewStatRow cards={[]} loading />
      <MultiSeriesSpendBoard
        label="Active accounts & projects per day"
        series={[]}
        scale="linear"
        onScaleChange={NO_OP}
        status="loading"
        fallbackWidth={1120}
        height={200}
      />
    </div>
  );
}
