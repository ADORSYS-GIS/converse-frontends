'use client';

import { useMemo } from 'react';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { ADMIN_USAGE_LENSES, OVERVIEW_RANGES, useAdminUsageParams } from '../client/url-state';
import type { AdminUsageLens } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { AdminUsageSubNav } from './admin-usage-sub-nav';
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
 * **The Export action** (converse-frontends#453) walks the SAME resolved panel list this page
 * renders — `/api/reports/page` re-resolves this route's own entry server-side through the same
 * `resolveDashboard`. It takes the page's route, window and FILTERS (this page's lens included, so
 * an exported report is grouped the way the screen was), never a pre-built URL.
 *
 * **The sub-nav** (story C6) is Estate | Chats. `/admin/usage/chats` is the same estate question
 * with one filter applied, so it is a tab on this page rather than a sixth admin rail row — see
 * `AdminUsageSubNav`'s own doc comment.
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

  // Every per-panel knob this page owns — axis per series panel, sort/page per table — declared
  // FROM the spec rather than from a hand-written list, so an override-added panel gets a real,
  // shareable knob like every other (`useDashboardKnobs`).
  const knobs = useDashboardKnobs(page);

  // The one object every `$lens` placeholder and every lens-driven `group_by` is resolved from.
  const filters = useMemo(() => ({ lens: view.lens as AdminUsageLens }), [view.lens]);

  const dashboard = useDashboard({
    page,
    window,
    filters,
    resetCadence: operations.resetCadence,
    scaleFor: knobs.scaleFor,
    onScaleChange: knobs.onScaleChange,
    sortFor: knobs.sortFor,
    onSortChange: knobs.onSortChange,
    pageFor: knobs.pageFor,
    onPageChange: knobs.onPageChange,
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
                knobs.resetTablePages();
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
        action={
          <DashboardExportButton
            route={page.route}
            title="Usage"
            range={view.range}
            rangeLabel={RANGE_LABELS[view.range]}
            window={window}
            from={view.from}
            to={view.to}
            filters={filters}
          />
        }
      />

      {/* Estate | Chats. `/admin/usage/chats` is a LENS on this page, not a sibling destination —
          see `AdminUsageSubNav` for why it is a tab row rather than a sixth admin rail row. */}
      <AdminUsageSubNav />

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
