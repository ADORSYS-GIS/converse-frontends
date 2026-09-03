'use client';

import { useMemo } from 'react';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { EstateBudgetPressure } from '@lightbridge/ui-web/src/sections/estate-budget-pressure';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';

import { OVERVIEW_RANGES, useAdminOverviewParams } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { useTranslation } from '../i18n/client';
import { rangeLabels, rangePresets } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useAdminEstateOperations } from './use-admin-estate-operations';

/**
 * `/admin/overview` — the operator dashboard, rendered from `dashboards.yaml`
 * (converse-frontends#447, story C4; decision D-K).
 *
 * **What this file no longer is.** Until 2026-09-02 it was eight hand-composed boards in a single
 * `flex flex-col gap-8` column, fed by a 650-line screen hook and a 540-line adapter module, each
 * board issuing its own `scope: 'all'` usage query that differed from its neighbour's only by
 * `group_by`. All three are gone: `use-admin-overview-screen.ts` and `admin-overview-usage.ts` are
 * deleted, the boards are eleven panels in `dashboards.yaml`, and the whole page's data comes from
 * one `useDashboard` call over a DEDUPLICATED query list. Adding a board here is now adding YAML.
 *
 * **The two zones that stay hand-written, and why.** `dashboards.yaml` describes usage queries.
 * Budget pressure reads `getBudgetBalance` (an RPC, one call per account) against month-to-date
 * spend that must NOT follow the page's range picker, and the refill row reads
 * `listPendingAugmentationRequests`. Neither is a usage query, so neither is a panel; inventing an
 * RPC panel type for two callers would be a worse abstraction than one honest container
 * (`use-admin-estate-operations.ts`). They render in their own `DashboardGrid` above the engine's —
 * two stacked grids rather than one, because a full-width zone stacks seamlessly and this keeps
 * the renderer free of a "hand-written children" escape hatch that every later page would reach
 * for. They are FIRST on the page deliberately: "who is about to breach their ceiling" and "what
 * is waiting on me" are the two things an operator opens this page to act on; the analytics grid
 * below is what they read afterwards.
 *
 * **Panel scale knobs stay in the URL** (ADR 0011), one per series panel, declared FROM the spec
 * (`useDashboardKnobs`) rather than from a hand-written table — so a panel a deployment adds
 * through the config-volume override gets a real, shareable `?<panel-id>-scale=` knob like every
 * other, and this container holds no local state at all. The DEFAULT axis is stated once, in the
 * YAML (`options.scale`), never duplicated here.
 *
 * **The Export action** (converse-frontends#453) walks the SAME resolved panel list this page
 * renders — `/api/reports/page` re-resolves this route's own `dashboards.yaml` entry server-side
 * through the same `resolveDashboard`, so a panel added to the YAML appears in the report with no
 * change here and no second export path. It takes this page's route, window and filters rather
 * than a pre-built URL, which is what makes that true rather than asserted.
 */

export interface AdminOverviewCentreProps {
  /** The validated `/admin/overview` entry, read from `dashboards.yaml` by the route's server
   *  component. Passed in rather than loaded here because the loader is `node:fs` — and because a
   *  page that takes its spec as a prop is the same page a Storybook story can render. */
  page: DashboardPageSpec;
}

export function AdminOverviewCentre({ page }: AdminOverviewCentreProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const [view, setView] = useAdminOverviewParams();
  const operations = useAdminEstateOperations();
  const labels = rangeLabels(tCommon);

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  // One URL knob per panel, declared from the spec — the axis on each series board, and the
  // sort/page on each table (`useDashboardKnobs`).
  const knobs = useDashboardKnobs(page);

  const dashboard = useDashboard({
    page,
    window,
    resetCadence: operations.resetCadence,
    ...knobs,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle', {
          range: labels[view.range],
          timezone: tCommon('timezone.utc'),
        })}
      />

      {/* The screen's parameters, on the floor above the cards (owner directive 2026-09-03,
          ADR 0015 amendment A2 — filters are outside cards). Export rides the TRAILING edge of
          this row: it is a page-scoped action over exactly the window beside it, drawn the same
          way on both reference screens (Chargetrip, Dub). */}
      <PageControls
        label={tCommon('controls.row-view')}
        groups={[
          {
            id: 'window',
            label: tCommon('controls.window'),
            children: (
              <DateRangeField
                label={tCommon('range.label')}
                presets={rangePresets(tCommon)}
                preset={view.from && view.to ? null : view.range}
                value={{ from: window.start, to: window.end }}
                onPresetChange={(range) => {
                  void setView({
                    range: range as (typeof OVERVIEW_RANGES)[number],
                    from: '',
                    to: '',
                  });
                }}
                onRangeChange={({ from, to }) => {
                  void setView({ from: toUrlDate(from), to: toUrlDate(to) });
                }}
                layout="inline"
                hideLabel
              />
            ),
          },
          {
            id: 'report',
            label: tCommon('controls.report'),
            align: 'end',
            children: (
              <DashboardExportButton
                route={page.route}
                title={t('overview.title')}
                range={view.range}
                rangeLabel={labels[view.range]}
                window={window}
                from={view.from}
                to={view.to}
              />
            ),
          },
        ]}
      />

      {operations.truncation ? (
        <InlineStatus>
          {t('overview.pressure-truncated', {
            shown: operations.truncation.shown,
            total: operations.truncation.total,
          })}
        </InlineStatus>
      ) : null}

      {/* The two RPC-backed zones. Plain `Card`s rather than `DashboardPanel`s: each already
          renders its own heading, and a panel would state it a second time — and neither has a
          zoomed reading a 1280×80vh dialog would add anything to. `data-span` is what the grid
          reads, exactly as `DashboardPanel` sets it. */}
      <DashboardGrid>
        <Card data-span="2">
          <EstateBudgetPressure
            accounts={operations.budgetPressureAccounts}
            status={operations.budgetPressureStatus}
            errorMessage={operations.budgetPressureError}
            onRetry={operations.onRetryBudgetPressure}
            emptyMessage={t('overview.no-budget-pressure')}
          />
        </Card>

        {operations.worstBudgetPressureAccount ? (
          <Card data-span="2">
            <SpendDashboard
              label={t('overview.burn-down-label', {
                account: operations.worstBudgetPressureAccount.name,
              })}
              series={operations.worstAccountBurnDown}
              cumulative
              ceiling={operations.worstBudgetPressureAccount.ceiling}
              status={operations.budgetPressureStatus === 'error' ? 'error' : 'ready'}
              errorMessage={operations.budgetPressureError}
              onRetry={operations.onRetryBudgetPressure}
              fallbackWidth={1120}
              height={200}
              formatYTick={formatUsdAxis}
              formatTooltipValue={formatUsd}
            />
          </Card>
        ) : null}

        {/* `OverviewStatRow` is self-panelling (its cards carry their own surface), so no `Card`
            here — the same exemption `DashboardPanel`'s `chrome: 'bare'` encodes for the engine's
            own stat panels. The caption is the zone's honesty line, not decoration: there is no
            decided-requests read path at all. */}
        <div data-span="2">
          <OverviewStatRow
            cards={operations.refillStatCards}
            loading={operations.refillStatCardsLoading}
          />
          <InlineStatus className="mt-2">{t('overview.decisions-unavailable')}</InlineStatus>
          {/* Still English: `budgetPeriodCaption` (converse-frontends#479) composes its sentence
              from a cadence clause, a relative "next …" phrase and a per-mode tick clause, which is
              a genuinely harder i18n shape than a template with placeholders. It is named in
              ADR 0017's "What is not translated yet" rather than half-translated here. */}
          <InlineStatus className="mt-1">{operations.budgetPeriodCaption}</InlineStatus>
        </div>
      </DashboardGrid>

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
