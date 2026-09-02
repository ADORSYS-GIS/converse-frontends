'use client';

import { useMemo } from 'react';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useSettingsOverviewParams } from '../client/url-state';
import { useConsoleScope } from '../client/use-console-scope';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardScales } from '../dashboards/use-dashboard-scales';
import { familyAccountIds, familyTruncationCaption } from './account-family';
import { RANGE_LABELS, RANGE_PRESETS } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useDashboardLabels } from './use-dashboard-labels';

/**
 * `/settings/overview/usage` — the signed-in identity's own ACCOUNT FAMILY overview, rendered from
 * `dashboards.yaml` (converse-frontends#455, story C12; decision D-K).
 *
 * **This page is why `scope: family` exists.** It is not the estate: `scope: all` answers for every
 * account on the deployment and is gated on `usage:read-all`, which most people signing in do not
 * hold — `/admin/overview` is the page that asks that question. What this page has always shown is
 * the accounts THIS identity can see, and the usage API has no scope for that (lightbridge-authz
 * #578), so it has always been a fan-out: one account-scoped query per family account, capped,
 * combined client-side. C12 moved that fan-out from a hand-written hook
 * (`use-usage-overview-screen.ts`, deleted with `usage-overview-usage.ts`) into the resolver, as a
 * `scope: family` expansion — so the panels are ordinary YAML and the combination is the engine's
 * ordinary per-(key, bucket) grouping rather than a bespoke set of combiners.
 *
 * **What stays here** is what belongs to the PAGE rather than to a panel: the cap itself and the
 * caption that states it. The resolver is handed an already-capped list precisely so it can never
 * silently truncate one — a page that queried 25 of 61 accounts and said nothing would be
 * reporting a family total that is not the family's total.
 *
 * Seven panels, one fan-out plus its comparison twin — the same request count the hand-written
 * screen fired for three panels.
 *
 * **No Export action here, and that is a decision rather than an omission.** C10's
 * `/api/reports/page` re-resolves a page's YAML entry server-side, and a `scope: family` panel
 * needs the CALLER'S OWN account family — a list this route has no session to read. Rendering the
 * button anyway would hand a reader a document in which every panel says "could not be loaded",
 * which reads as "no usage" rather than "this cannot be asked here". `page-report.ts` refuses such
 * a route with `unexportable_route` for the same reason, so a hand-built URL gets the same answer.
 * Exporting one account at a time (`/accounts/<id>/overview`) is the honest alternative, and it
 * works today.
 */

export interface UsageOverviewCentreProps {
  /** The validated `/settings/overview/usage` entry, read by the route's server component. */
  page: DashboardPageSpec;
}

export function UsageOverviewCentre({ page }: UsageOverviewCentreProps) {
  const scope = useConsoleScope();
  const [view, setView] = useSettingsOverviewParams();
  const localLabels = useDashboardLabels();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const allAccountIds = useMemo(
    () => scope.allAccounts.map((account) => account.id),
    [scope.allAccounts]
  );
  const includedIds = useMemo(() => familyAccountIds(allAccountIds), [allAccountIds]);
  const truncationCaption = familyTruncationCaption(allAccountIds.length);

  const { scaleFor, onScaleChange } = useDashboardScales(page);

  const dashboard = useDashboard({
    page,
    window,
    familyAccountIds: includedIds,
    scaleFor,
    onScaleChange,
    localLabels,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage overview"
        subtitle={`Your account family · ${RANGE_LABELS[view.range]} · UTC`}
        controls={
          <DateRangeField
            label="Range"
            presets={RANGE_PRESETS}
            preset={view.from && view.to ? null : view.range}
            value={{ from: window.start, to: window.end }}
            onPresetChange={(range) => {
              void setView({ range: range as (typeof OVERVIEW_RANGES)[number], from: '', to: '' });
            }}
            onRangeChange={({ from, to }) => {
              void setView({ from: toUrlDate(from), to: toUrlDate(to) });
            }}
            layout="inline"
            hideLabel
          />
        }
      />

      {truncationCaption ? <InlineStatus>{truncationCaption}</InlineStatus> : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
