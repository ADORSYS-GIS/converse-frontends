'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ShareBar } from '@lightbridge/ui-web/src/components/share-bar';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { DATA_INK_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import { EstateBudgetPressure } from '@lightbridge/ui-web/src/sections/estate-budget-pressure';
import { LatencyStatCards } from '@lightbridge/ui-web/src/sections/latency-stat-cards';
import { MultiSeriesSpendBoard } from '@lightbridge/ui-web/src/sections/multi-series-spend-board';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { TopSpendersLedger } from '@lightbridge/ui-web/src/sections/top-spenders-ledger';

import {
  REFILL_DECISIONS_UNAVAILABLE_CAPTION,
  REQUEST_ERROR_RATE_UNAVAILABLE_CAPTION,
  useAdminOverviewScreen,
} from './use-admin-overview-screen';

/** A count-valued figure — never the currency ladder (`lib/money`'s own contract is dollars
 *  only). Reused across every count-series board on this page (dashboard 6's request volume,
 *  dashboard 8's adoption). */
function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

/** `LatencyStatCards` carries no loading/error state of its own (same contract
 *  `settings-overview-centre.tsx`'s own latency zone already follows) — this mirrors that file's
 *  skeleton geometry exactly rather than inventing a second shape for the same zone kind. */
function skeletonRows(count: number) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      {Array.from({ length: count }, (_, row) => (
        <div key={row} className="skeleton h-[28px]" />
      ))}
    </div>
  );
}

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build).
 * The centre column, and the whole of this route. The shell is NOT here — it is mounted once by
 * `app/(console)/layout.tsx`.
 *
 * Composition matches the approved page story (`Pages/AdminOverview`), updated 2026-08-31 (owner
 * ruling, verbatim: "How come we're using cards almost everywhere, but not in the admin pages?").
 * The original `claude/sb-admin-dashboards`@aaf3fe6 batch's "charts and tables render on the
 * floor, not in cards" ruling for this page is overturned — it was always a narrower carve-out
 * against ADR 0012 D3's general "`Card` is the default zone container," and the owner has now
 * closed that carve-out for consistency with every other page in the console (`overview-centre.tsx`
 * wraps its own zones the identical way — see that file's own doc comment for the precedent this
 * one follows). Every zone below sits in its own `Card`, matching `overview-centre.tsx`'s
 * granularity: one `Card` per rendered board/section, sections keep whatever heading they already
 * render (`ZoneHeading`, or a section's own `label`) rather than being promoted into `Card`'s own
 * `title`, and a caption that describes one specific board lives inside that board's `Card`, not
 * beside it. Two things stay on the floor, per that same precedent: `PageHeader`, and any bare
 * page-level `InlineStatus` not tied to one specific board (the truncation caption) — plus
 * `OverviewStatRow`'s stat cards, which stay self-panelled (their own `surface` fill) whether or
 * not a `Card` also wraps the row they sit in (console-ui skill, "Shape and layout").
 * `use-admin-overview-screen.ts` supplies the real data the story's fixtures stood in for,
 * including two honest divergences from the story's own drawn shape (dashboard 5 has no
 * decisions-over-time board or median-time-to-decision card; dashboard 6 has no error-rate line)
 * — both are real backend gaps, captioned inline rather than fabricated, per that hook's own doc
 * comment.
 */
export function AdminOverviewCentre() {
  const screen = useAdminOverviewScreen();

  const modelMixTotal = screen.modelSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        subtitle={screen.subtitle}
        controls={<DateRangeField {...screen.rangeField} layout="inline" hideLabel />}
      />

      {screen.truncationCaption ? <InlineStatus>{screen.truncationCaption}</InlineStatus> : null}

      {/* ── 1. Estate spend over time ── */}
      <Card>
        <MultiSeriesSpendBoard
          label="Total spend vs previous period"
          series={screen.estateTotalSeries}
          scale={screen.estateTotalScale}
          onScaleChange={screen.setEstateTotalScale}
          status={screen.estateTotalStatus}
          errorMessage={screen.errorMessage}
          onRetry={screen.onRetry}
          fallbackWidth={1120}
          height={200}
          emptyMessage="No usage in this range."
        />
      </Card>
      <Card>
        <MultiSeriesSpendBoard
          label="Spend by account"
          series={screen.estateAccountSeries}
          scale={screen.estateAccountScale}
          onScaleChange={screen.setEstateAccountScale}
          status={screen.estateTotalStatus}
          errorMessage={screen.errorMessage}
          onRetry={screen.onRetry}
          fallbackWidth={1120}
          height={220}
          emptyMessage="No usage in this range."
        />
      </Card>

      {/* ── 2. Model mix ── */}
      <Card>
        <ZoneHeading
          label="Spend by model — estate share"
          trailing={
            modelMixTotal > 0 && screen.estateTotalStatus === 'ready' ? (
              <span className={DATA_INK_CLASS}>{formatUsd(modelMixTotal)}</span>
            ) : undefined
          }
        />
        <ShareBar className="mt-4" segments={screen.modelSegments} />
      </Card>
      <Card>
        <MultiSeriesSpendBoard
          label="Spend by model over time"
          series={screen.modelMixSeries}
          scale={screen.modelMixScale}
          onScaleChange={screen.setModelMixScale}
          status={screen.estateTotalStatus}
          errorMessage={screen.errorMessage}
          onRetry={screen.onRetry}
          fallbackWidth={1120}
          height={220}
          emptyMessage="No usage in this range."
        />
      </Card>

      {/* ── 3. Top spenders ── */}
      <Card>
        <ZoneHeading label="Top spenders" />
        <TopSpendersLedger
          className="mt-4"
          rows={screen.topSpenders}
          loading={screen.topSpendersLoading}
          loadingRowCount={8}
          error={screen.topSpendersError}
          onRetry={screen.onRetryTopSpenders}
        />
      </Card>

      {/* ── 4. Budget pressure ── */}
      <Card>
        <EstateBudgetPressure
          accounts={screen.budgetPressureAccounts}
          status={screen.budgetPressureStatus}
          errorMessage={screen.budgetPressureError}
          onRetry={screen.onRetryBudgetPressure}
        />
      </Card>
      <Card>
        {screen.worstBudgetPressureAccount ? (
          <SpendDashboard
            label={`Budget burn-down — ${screen.worstBudgetPressureAccount.name}`}
            series={screen.worstAccountBurnDown}
            cumulative
            ceiling={screen.worstBudgetPressureAccount.ceiling}
            status={screen.budgetPressureStatus === 'error' ? 'error' : 'ready'}
            errorMessage={screen.budgetPressureError}
            onRetry={screen.onRetryBudgetPressure}
            fallbackWidth={1120}
            height={200}
            formatYTick={formatUsdAxis}
            formatTooltipValue={formatUsd}
          />
        ) : screen.budgetPressureStatus === 'ready' ? (
          <InlineStatus>No account with a readable budget ceiling drew anything this period.</InlineStatus>
        ) : null}
      </Card>

      {/* ── 5. Refill operations ── */}
      <OverviewStatRow cards={screen.refillStatCards} loading={screen.refillStatCardsLoading} />
      <InlineStatus>{REFILL_DECISIONS_UNAVAILABLE_CAPTION}</InlineStatus>

      {/* ── 6. Request volume & errors ── */}
      <Card>
        <MultiSeriesSpendBoard
          label="Request volume"
          series={screen.requestVolumeSeries}
          scale={screen.requestVolumeScale}
          onScaleChange={screen.setRequestVolumeScale}
          status={screen.estateTotalStatus}
          errorMessage={screen.errorMessage}
          onRetry={screen.onRetry}
          fallbackWidth={1120}
          height={200}
          formatValue={formatCount}
          formatYTick={formatCount}
          emptyMessage="No requests in this range."
        />
        <InlineStatus className="mt-2">{REQUEST_ERROR_RATE_UNAVAILABLE_CAPTION}</InlineStatus>
      </Card>

      {/* ── 7. Latency board — scoped to the estate's single busiest account (see
           `use-admin-overview-screen.ts`'s own doc comment for why an estate-wide blend of
           per-account percentiles is not honestly computable). ── */}
      <Card>
        <ZoneHeading label="Latency by model" />
        {screen.latencyStatus === 'error' ? (
          <InlineStatus className="mt-4">Failed to load latency for this account.</InlineStatus>
        ) : screen.latencyStatus === 'loading' ? (
          skeletonRows(4)
        ) : (
          <LatencyStatCards className="mt-4" rows={screen.latencyRows} />
        )}
        {screen.latencyCaption ? (
          <InlineStatus className="mt-2">{screen.latencyCaption}</InlineStatus>
        ) : null}
      </Card>

      {/* ── 8. Adoption ── */}
      <OverviewStatRow cards={screen.adoptionStatCards} loading={screen.adoptionStatCardsLoading} />
      <Card>
        <MultiSeriesSpendBoard
          label="Active accounts & projects per day"
          series={screen.adoptionOverTimeSeries}
          scale={screen.adoptionScale}
          onScaleChange={screen.setAdoptionScale}
          status={screen.estateTotalStatus}
          errorMessage={screen.errorMessage}
          onRetry={screen.onRetry}
          fallbackWidth={1120}
          height={200}
          formatValue={formatCount}
          formatYTick={formatCount}
          emptyMessage="No activity in this range."
        />
      </Card>
    </div>
  );
}
