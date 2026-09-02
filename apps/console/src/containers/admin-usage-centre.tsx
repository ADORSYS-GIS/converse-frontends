'use client';

import { useCallback, useMemo } from 'react';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import type { LedgerSort } from '@lightbridge/ui-web/src/components/ledger-table';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart';
import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import {
  ADMIN_USAGE_LENSES,
  dashboardDirKey,
  dashboardPageKey,
  dashboardScaleKey,
  dashboardSortKey,
  OVERVIEW_RANGES,
  useAdminUsageParams,
  useDashboardScaleParams,
  useDashboardTableParams,
} from '../client/url-state';
import type { AdminUsageLens } from '../client/url-state';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { RANGE_DAYS, resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useAdminEstateOperations } from './use-admin-estate-operations';

/**
 * `/admin/usage` — the estate's usage surface, rendered ENTIRELY from `dashboards.yaml`
 * (converse-frontends#448, story C5; decision D-K).
 *
 * **There is no per-panel query code in this file, and that is the acceptance criterion.** Nineteen
 * panels — two totals, a plan breakdown, four series boards, three rings, two rankings, a share
 * bar, two stats and two ledgers — are one YAML entry and one `useDashboard` call. What is left
 * here is exactly the three things a PAGE owns and a panel cannot: its window (the range picker),
 * its lens (which entity the actor panels are about), and the URL knobs that make both, plus every
 * panel's own axis/sort/page, restorable from a pasted link (ADR 0011).
 *
 * **The lens leads with User** — the owner's actor-identity rule, and the reason
 * `ADMIN_USAGE_LENSES` is ordered rather than alphabetical. Switching it re-groups five panels
 * (`active-actors`, `cost-by-actor`, `tokens-by-actor`, `top-actor-cost`, `actors-table`) onto the
 * new dimension AND rewrites the `?type=` on every row link, because `resolve-dashboard.ts`
 * substitutes `$lens` into `options.link` at the same moment it swaps the `group_by`. A row that
 * said "account" while linking to `?type=user` is precisely the class of quiet wrongness that
 * substitution exists to prevent.
 *
 * **Knobs are declared FROM the spec, never from a hand-written table.** Which panels are series
 * and which are tables is DATA — a deployment can add or remove one through the config-volume
 * override without a rebuild (owner ruling Q11) — so a fixed list here would leave an
 * override-added panel's toggle steering nothing. Same reasoning, and the same helpers, as
 * `/admin/overview`.
 *
 * There is no Export action yet, deliberately: C10 owns the export pipeline and adds one action to
 * every YAML-driven page at once, walking the same resolved panel list this page renders.
 */

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  mtd: 'This month',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
}));

/** The lens control's own wording — "Users", not "user_id". Ordered by the constant, so User leads. */
const LENS_OPTIONS = ADMIN_USAGE_LENSES.map((value) => ({
  value,
  label: { user: 'Users', account: 'Accounts', project: 'Projects' }[value],
}));

export interface AdminUsageCentreProps {
  /** The validated `/admin/usage` entry, read from `dashboards.yaml` by the route's server
   *  component. Passed in rather than loaded here because the loader is `node:fs` — and because a
   *  page that takes its spec as a prop is the same page a Storybook story can render. */
  page: DashboardPageSpec;
}

export function AdminUsageCentre({ page }: AdminUsageCentreProps) {
  const [view, setView] = useAdminUsageParams();
  // Only for the comparison cadence the two `compare: true` totals measure against (D-F, owner
  // Q8). This page draws neither of that hook's zones — an estate usage page is not a budget page.
  const operations = useAdminEstateOperations();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const seriesPanelIds = useMemo(
    () =>
      page.panels
        .filter((panel) => panel.type === 'series' || panel.type === 'latency-series')
        .map((panel) => panel.id),
    [page]
  );
  const tablePanelIds = useMemo(
    () => page.panels.filter((panel) => panel.type === 'table').map((panel) => panel.id),
    [page]
  );

  const [scales, setScales] = useDashboardScaleParams(seriesPanelIds);
  const [tables, setTables] = useDashboardTableParams(tablePanelIds);

  const scaleFor = useCallback(
    (panelId: string): MultiSeriesSpendScale | undefined =>
      (scales[dashboardScaleKey(panelId)] as MultiSeriesSpendScale | null) ?? undefined,
    [scales]
  );

  const onScaleChange = useCallback(
    (panelId: string, scale: MultiSeriesSpendScale) => {
      void setScales({ [dashboardScaleKey(panelId)]: scale });
    },
    [setScales]
  );

  // `undefined` (not a default) when the URL carries no sort: the adapter's own cost-descending
  // order is the panel's default, stated once, there.
  const sortFor = useCallback(
    (panelId: string): LedgerSort | undefined => {
      const key = tables[dashboardSortKey(panelId)] as string | null;
      if (!key) return undefined;
      const direction = (tables[dashboardDirKey(panelId)] as 'asc' | 'desc' | null) ?? 'desc';
      return { key, direction };
    },
    [tables]
  );

  const onSortChange = useCallback(
    (panelId: string, sort: LedgerSort) => {
      // Re-sorting returns to page 1: staying on page 4 of a different ordering shows rows that
      // have nothing to do with either the old view or the new one.
      void setTables({
        [dashboardSortKey(panelId)]: sort.key,
        [dashboardDirKey(panelId)]: sort.direction,
        [dashboardPageKey(panelId)]: 0,
      });
    },
    [setTables]
  );

  const pageFor = useCallback(
    (panelId: string): number => (tables[dashboardPageKey(panelId)] as number | null) ?? 0,
    [tables]
  );

  const onPageChange = useCallback(
    (panelId: string, next: number) => {
      void setTables({ [dashboardPageKey(panelId)]: next });
    },
    [setTables]
  );

  // The one object every `$lens` placeholder and every lens-driven `group_by` is resolved from.
  const filters = useMemo(() => ({ lens: view.lens as AdminUsageLens }), [view.lens]);

  const dashboard = useDashboard({
    page,
    window,
    filters,
    resetCadence: operations.resetCadence,
    scaleFor,
    onScaleChange,
    sortFor,
    onSortChange,
    pageFor,
    onPageChange,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage"
        subtitle={`Operator · Every account with usage · ${RANGE_LABELS[view.range]} · UTC`}
        controls={
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              aria-label="Actor lens"
              options={LENS_OPTIONS}
              value={view.lens}
              onChange={(lens) => {
                // Changing the lens invalidates every table's page cursor for the same reason a
                // re-sort does: the rows are different rows now.
                void setView({ lens: lens as AdminUsageLens });
                void setTables(
                  Object.fromEntries(tablePanelIds.map((id) => [dashboardPageKey(id), 0]))
                );
              }}
            />
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
          </div>
        }
      />

      {/* The batch identity lookup's own failure line. Never an error state for the page: the
          spend, request and token figures are real whether or not a name resolved, so the panels
          render and this says what is missing from them. */}
      {dashboard.actorLabelsErrorMessage ? (
        <InlineStatus>{dashboard.actorLabelsErrorMessage}</InlineStatus>
      ) : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
