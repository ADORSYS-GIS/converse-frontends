'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useAdminUsageActorParams } from '../client/url-state';
import { actorIdsOf } from '../dashboards/actor-labels';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { ADMIN_USAGE_ROUTE, type AdminUsageActorType } from '../dashboards/usage-routes';
import { useTranslation } from '../i18n/client';
import { rangeLabels, rangePresets } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useActorBudget } from './use-actor-budget';

/**
 * `/admin/usage/actors/[actorId]?type=user|account|project` — ONE actor's usage, rendered entirely
 * from `dashboards.yaml` (converse-frontends#449, story C6).
 *
 * **This file is the proof that the engine handles PARAMETERISED pages.** There is no per-actor
 * query anywhere in it: nine panels are one YAML entry whose queries say `scope: $type` and
 * `scope_id: $actorId`, and `resolveDashboard` substitutes both from the `filters` object below.
 * What is left here is what a PAGE owns and a panel cannot — its window, its identity (the header),
 * its way back, and the budget zone that is not a usage query at all.
 *
 * **The header names the actor, and never invents one.** The id is seeded into the page's single
 * batched `resolveActorLabels` call (`seedActorIds`), so the title comes from the same lookup every
 * panel labels its rows with — one request, not two, and never a header that disagrees with a row
 * about who somebody is. An id nothing resolved keeps its `sentinelLabel` and the page renders in
 * full: an unresolved NAME is not an unresolved ACTOR, and the spend figures are real either way.
 * That is an explicit AC, and the reason this page 404s an invalid `?type=` (a closed enum, checked
 * server-side) but never a real id.
 *
 * **The comparison cadence is the actor's own** (decision D-F, owner Q8): for an account, the
 * effective reset schedule the backend resolves for it (account > billing_plan > global); for a
 * user or a project, the monthly default — neither has a budget, so neither has a reset period a
 * "vs previous" could honestly be measured against. The cadence chooses the COMPARISON window and
 * nothing else: the page's own window is always the one the range picker shows
 * (converse-frontends#448).
 */

export interface AdminUsageActorCentreProps {
  /** The validated `/admin/usage/actors/[actorId]` entry, read from `dashboards.yaml` by the
   *  route's server component (the loader is `node:fs`). */
  page: DashboardPageSpec;
  /** The path segment, already percent-decoded by the ROUTE (`decodeRouteParam`) — Next hands a
   *  page the raw segment, so `cratestack%2Fcratestack` is turned back into `cratestack/cratestack`
   *  there and never touched again here. */
  actorId: string;
  /** Already validated against the closed enum by the route, which 404s anything else. */
  type: AdminUsageActorType;
}

export function AdminUsageActorCentre({ page, actorId, type }: AdminUsageActorCentreProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const labels = rangeLabels(tCommon);
  // What a `?type=` reads as in the header's own kicker line, and — lowercased — in the
  // "no profile resolved" line below.
  const typeNoun = t(`usage.actor.type.${type}`);
  const [view, setView] = useAdminUsageActorParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const knobs = useDashboardKnobs(page);
  const budget = useActorBudget(actorId, type);

  // The two `$param` placeholders every panel on this page resolves from. An unresolved one throws
  // rather than substituting an empty string — see `resolve-dashboard.ts`.
  const filters = useMemo(() => ({ actorId, type }), [actorId, type]);
  const seedActorIds = useMemo(() => actorIdsOf(type, actorId), [type, actorId]);

  const dashboard = useDashboard({
    page,
    window,
    filters,
    resetCadence: budget.resetCadence,
    seedActorIds,
    scaleFor: knobs.scaleFor,
    onScaleChange: knobs.onScaleChange,
    sortFor: knobs.sortFor,
    onSortChange: knobs.onSortChange,
    pageFor: knobs.pageFor,
    onPageChange: knobs.onPageChange,
  });

  // The resolved identity, from the page's own batch. `labelFor` falls back to `sentinelLabel`
  // while the lookup is in flight and after it fails, so this is never blank and never invented.
  const identity = dashboard.labelFor(type, actorId);
  const subtitle = [typeNoun, identity.secondary, labels[view.range], tCommon('timezone.utc')]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={identity.label}
        subtitle={subtitle}
        controls={
          <DateRangeField
            label={tCommon('range.label')}
            presets={rangePresets(tCommon)}
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
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* The way back to the row this page was opened from. A real anchor rather than a
                history-pop handler: this page is linkable and routinely arrived at by pasted URL,
                where there is no "back" to pop. */}
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={ADMIN_USAGE_ROUTE} />}>
              {tCommon('actions.back-to-usage')}
            </Button>
            <DashboardExportButton
              route={page.route}
              title={identity.label}
              range={view.range}
              rangeLabel={labels[view.range]}
              window={window}
              from={view.from}
              to={view.to}
              filters={filters}
            />
          </div>
        }
      />

      {/* An id nothing resolved is stated, not hidden: the figures below are this id's real usage,
          and a header reading a raw cuid with no explanation looks like a bug rather than a fact
          about the identity data. */}
      {identity.subtle ? (
        <InlineStatus>
          {t('usage.actor.unresolved', { type: typeNoun.toLocaleLowerCase() })}
        </InlineStatus>
      ) : null}

      {dashboard.actorLabelsErrorMessage ? (
        <InlineStatus>{dashboard.actorLabelsErrorMessage}</InlineStatus>
      ) : null}

      {/* Accounts only. Not a panel: two RPCs and a billing-period window, none of which
          `dashboards.yaml` describes — see `useActorBudget`. It renders in its own grid ABOVE the
          engine's, the same two-stacked-grids composition `/admin/overview` uses, because a
          ceiling is what an operator opened this page to act on and the analytics are what they
          read afterwards. */}
      {budget.present ? (
        <DashboardGrid>
          <Card data-span="2">
            <BudgetPanel
              label={t('usage.actor.budget-label')}
              budget={budget.budget}
              nextReset={budget.nextReset}
            />
          </Card>
        </DashboardGrid>
      ) : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
