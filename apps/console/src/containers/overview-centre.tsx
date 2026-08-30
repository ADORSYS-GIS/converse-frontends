'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { BudgetPressure } from '@lightbridge/ui-web/src/sections/budget-pressure';
import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';
import Link from 'next/link';

import { OverviewScopeSlot } from './overview-scope-slot';
import { useOverviewScreen } from './use-overview-screen';

/**
 * `/` — one dashboard, parameterised by role (shell revamp phase 4). This route supplies no
 * `@rail`/`@scope` slot at any tier — the shell is mounted once by `app/(console)/layout.tsx`.
 *
 * Composition, top to bottom: `PageHeader` (controls + the `Export` action) → the money-first stat
 * row → SPEND OVER TIME → SPEND BY PROJECT → SPEND BY MODEL → BUDGET, all five real for every
 * signed-in user; then, ADMIN-ONLY and purely additive, BUDGET PRESSURE → KEY HYGIENE → REFILL
 * REQUESTS. The admin block replaces `/admin?section=overview` (deleted this phase) — `/admin` is
 * now the refill-review queue alone, reached from the sidebar's "Refill requests" item or the
 * REFILL REQUESTS card's own `Review` link below.
 *
 * LATENCY is gone (phase 9.2, 2026-08-30 owner directive): the usage backend's events are
 * aggregate metric signals with no per-request duration, so that panel could never fill. SPEND BY
 * MODEL replaces it — reuses `SpendShareSection` verbatim (it hard-codes no project-specific
 * labelling) over a second, model-grouped consumption query scoped identically to SPEND above
 * (`use-overview-screen.ts`'s `modelSpendSegments`), for every user, not admin-gated.
 *
 * `Card` wraps every zone below the stat row (phase 4 supersedes the earlier "render uncontained
 * on the floor" reading for these dashboard zones specifically — see `Card`'s own doc comment for
 * the precedent). Several sections already render their own tracked heading (`SpendDashboard`,
 * `SpendShareSection`, `BudgetPanel`, `BudgetPressure` all default their own `label`); those
 * `Card`s carry no `title` of their own; only the section's `label` is overridden to the name this
 * composition wants, so each zone has exactly ONE heading, never two stacked. `ApiKeysHygieneNotes`
 * and the Refill requests block have no heading of their own, so their `Card` DOES carry a `title`.
 */
const formatSpendTooltip = (value: number) => formatUsd(value);

export function OverviewCentre() {
  const screen = useOverviewScreen(<OverviewScopeSlot />);

  const spendTotal = screen.spendSegments.reduce((sum, segment) => sum + segment.value, 0);
  const modelSpendTotal = screen.modelSpendSegments.reduce(
    (sum, segment) => sum + segment.value,
    0
  );
  const subtitle = screen.scopeAccountLabel
    ? `${screen.scopeAccountLabel} · ${screen.scopeProjectLabel} · ${screen.subline}`
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        subtitle={subtitle}
        controls={
          <OverviewControls
            rangeField={screen.rangeField}
            bucketField={screen.bucketField}
            groupByField={screen.groupByField}
            projectField={screen.projectField}
          />
        }
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => screen.report.onOpenChange(true)}>
            Export
          </Button>
        }
      />

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <ReportExportDialog {...screen.report} />

      <Card>
        <SpendDashboard
          label="Spend over time"
          series={screen.spendSeries}
          status={screen.spendStatus}
          errorMessage={screen.spendErrorMessage}
          onRetry={screen.spendRetry}
          fallbackWidth={840}
          height={220}
          formatYTick={formatUsdAxis}
          formatTooltipValue={formatSpendTooltip}
          formatLegendValue={(series) =>
            formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
          }
          onSelectSeries={screen.setSelectedSeriesKey}
        />
      </Card>

      <Card>
        <SpendShareSection
          label="Spend by project"
          segments={screen.spendSegments}
          status={screen.spendStatus}
          errorMessage={screen.spendErrorMessage}
          onRetry={screen.spendRetry}
          selectedKey={screen.selectedSeriesKey}
          onSelectSegment={screen.setSelectedSeriesKey}
          total={spendTotal > 0 ? formatUsd(spendTotal) : undefined}
        />
      </Card>

      <Card>
        <SpendShareSection
          label="Spend by model"
          segments={screen.modelSpendSegments}
          status={screen.modelSpendStatus}
          errorMessage={screen.modelSpendErrorMessage}
          onRetry={screen.modelSpendRetry}
          total={modelSpendTotal > 0 ? formatUsd(modelSpendTotal) : undefined}
        />
      </Card>

      <Card>
        <BudgetPanel
          className="w-full"
          label="Budget"
          budget={screen.budget}
          heroAction={
            screen.refillAction ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={screen.refillAction.pending}
                onClick={screen.refillAction.onClick}>
                {screen.refillAction.label}
              </Button>
            ) : undefined
          }
        />
      </Card>
      {screen.refillErrorMessage ? (
        <ErrorLine message={`Refill request failed: ${screen.refillErrorMessage}`} />
      ) : null}

      {/* ── admin-only, purely additive — see this file's own doc comment ─────────────────── */}
      {screen.isAdmin && screen.adminPressure ? (
        <Card>
          <BudgetPressure
            label="Budget pressure"
            projects={screen.adminPressure.projects}
            ceiling={screen.adminPressure.ceiling}
            status={screen.adminPressure.status}
            errorMessage={screen.adminPressure.errorMessage}
            onRetry={screen.adminPressure.onRetry}
            note={screen.adminPressure.note}
          />
        </Card>
      ) : null}

      {screen.isAdmin && screen.adminHygiene ? (
        <Card title="Key hygiene">
          <InlineStatus>{screen.adminHygiene.summary}</InlineStatus>
          <ApiKeysHygieneNotes className="mt-3" hygiene={screen.adminHygiene.hygiene} />
          {screen.adminHygiene.caveat ? (
            <InlineStatus className="mt-2">{screen.adminHygiene.caveat}</InlineStatus>
          ) : null}
        </Card>
      ) : null}

      {screen.isAdmin && screen.refillRequestStatus ? (
        <Card title="Refill requests">
          <p className="text-soft font-mono text-[11px]">
            {screen.refillRequestStatus.pendingCount} pending ·{' '}
            {screen.refillRequestStatus.submittedLabel}
          </p>
          <Link
            href="/admin"
            className="text-soft hover:text-ink mt-1 inline-block font-sans text-[11px] underline-offset-2 hover:underline">
            Review →
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
