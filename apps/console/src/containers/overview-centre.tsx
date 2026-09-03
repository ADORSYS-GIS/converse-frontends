'use client';

import { useMemo } from 'react';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useOverviewParams } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardScales } from '../dashboards/use-dashboard-scales';
import { useAccountId } from '../client/use-account-id';
import { RANGE_LABELS, RANGE_PRESETS } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useAccountOverviewZones } from './use-account-overview-zones';
import { useDashboardLabels } from './use-dashboard-labels';

/**
 * `/accounts/[accountId]/overview` — the account-scoped user dashboard, rendered from
 * `dashboards.yaml` (converse-frontends#455, story C12; decision D-K).
 *
 * **What this file no longer is.** Until 2026-09-02 it hand-composed five zones fed by an 810-line
 * screen hook: a spend chart, a share bar whose DIMENSION changed under a `?group-by=` select, a
 * by-model board, a budget card and a stat row — four usage queries, none shared, plus a toolbar
 * of three knobs (`bucket`, `group-by`, `model`) that existed to reshape those zones. All of it is
 * gone. `use-overview-screen.ts` is deleted, the boards are eight panels in `dashboards.yaml`, and
 * the page's usage data comes from one `useDashboard` call over a DEDUPLICATED query list — four
 * requests for eight panels. Adding a board here is now adding YAML.
 *
 * **The `?group-by=` select went with it, deliberately.** A breakdown whose dimension is a knob is
 * one board pretending to be four; the four are panels now (by project, by model, by API key, and
 * the model share), each visible at once instead of one at a time behind a select. `bucket` went
 * because the engine resolves bucket width from the range (`bucket: auto`), and `model` because it
 * only ever offered a single inert "All models" entry. A knob that steers nothing is a defect —
 * the same rule that took `bucket` out of the settings lenses' own param table.
 *
 * **The zones that stay hand-written, and why.** `dashboards.yaml` describes usage queries over
 * the page's RANGE. BUDGET reads an RPC ceiling against BILLING-PERIOD consumption, and the stat
 * row beside it counts projects and keys through refine — neither is a range-scoped usage query,
 * so neither is a panel (the same line `/admin/overview` draws for its budget-pressure zone). They
 * render in their own `DashboardGrid` FIRST, with the caption that states which window they are
 * about, because "how much of my allowance is left" is what a person opens this page to check.
 *
 * **Export is C10's `DashboardExportButton`** (converse-frontends#453), which walks the SAME
 * resolved panel list this page renders — `/api/reports/page` re-resolves this route's own
 * `dashboards.yaml` entry server-side through the same `resolveDashboard`. The consumption-report
 * dialog this page used to open is gone with the hook that built it: it produced a document that
 * knew nothing about the panels beside it, and keeping both would have been two export paths for
 * one page.
 *
 * Panel scale knobs stay in the URL (ADR 0011), one per series panel, declared FROM the spec
 * (`useDashboardScales`) — so a panel a deployment adds through the config-volume override gets a
 * real, shareable `?<panel-id>-scale=` knob like every other, and this container holds no local
 * state at all.
 */

export interface OverviewCentreProps {
  /** The validated `/accounts/[accountId]/overview` entry, read from `dashboards.yaml` by the
   *  route's server component. Passed in rather than loaded here because the loader is `node:fs` —
   *  and because a page that takes its spec as a prop is the same page a story can render. */
  page: DashboardPageSpec;
}

export function OverviewCentre({ page }: OverviewCentreProps) {
  const accountId = useAccountId();
  const [view, setView] = useOverviewParams();
  const zones = useAccountOverviewZones();
  const localLabels = useDashboardLabels({ projectId: zones.projectId ?? null });

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  // The page's own `$param` values. `project` is deliberately allowed to be absent: the panels
  // read it through the OPTIONAL `$project?` placeholder, which drops the filter rather than
  // sending an empty `project_id` that would match nothing.
  const filters = useMemo(
    () => ({ accountId, project: zones.projectId }),
    [accountId, zones.projectId]
  );

  const { scaleFor, onScaleChange } = useDashboardScales(page);

  const dashboard = useDashboard({
    page,
    window,
    filters,
    scaleFor,
    onScaleChange,
    localLabels,
  });

  const subtitle = zones.scopeAccountLabel
    ? `${zones.scopeAccountLabel} · ${zones.scopeProjectLabel} · ${RANGE_LABELS[view.range]} · UTC`
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        subtitle={subtitle}
        controls={
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeField
              label="Range"
              presets={RANGE_PRESETS}
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
            <SelectField {...zones.projectField} layout="inline" hideLabel />
          </div>
        }
        // The export (converse-frontends#453, C10). It takes this page's own identity — the
        // `dashboards.yaml` route, the resolved window, the filters — rather than a pre-built URL,
        // so the report is a rendering of exactly the entry this page just queried. It replaced
        // the consumption-report dialog this page used to open, which knew nothing about the
        // panels beside it: one export path, walking the same resolved panel list.
        action={
          <DashboardExportButton
            route={page.route}
            title="Overview"
            range={view.range}
            rangeLabel={RANGE_LABELS[view.range]}
            window={window}
            from={view.from}
            to={view.to}
            filters={filters}
          />
        }
      />

      {/* The BILLING-PERIOD zones. `OverviewStatRow` is self-panelling (its cards carry their own
          surface), so it takes no `Card` — the same exemption `DashboardPanel`'s `chrome: 'bare'`
          encodes for the engine's own stat panels. */}
      <DashboardGrid>
        <div data-span="2">
          <OverviewStatRow cards={zones.statCards} loading={zones.statCardsLoading} />
        </div>
        <Card data-span="2">
          {/* `sinceReset` and `nextReset` (story C8; owner question 2026-09-03) ride on the
              hand-written card, not on a panel: both read `getEffectiveResetSchedule`, an RPC, and
              both are facts about the BUDGET PERIOD and its reset cadence rather than about the
              range picked above — the same two reasons the ceiling beside them is not a panel
              either. The pair reads as one: what this reset cycle has drawn, then when the next
              cycle starts. */}
          <BudgetPanel
            className="w-full"
            label="Budget"
            budget={zones.budget}
            sinceReset={zones.sinceReset}
            nextReset={zones.nextReset}
          />
          <InlineStatus className="mt-2">{zones.budgetPeriodCaption}</InlineStatus>
        </Card>
      </DashboardGrid>

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
