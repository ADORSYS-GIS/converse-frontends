'use client';

import { useMemo } from 'react';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { BudgetPressure } from '@lightbridge/ui-web/src/sections/budget-pressure';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';

import { OVERVIEW_RANGES, useSettingsOverviewParams } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { useTranslation } from '../i18n/client';
import { rangeLabels, rangePresets } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useDashboardLabels } from './use-dashboard-labels';
import { useSettingsOverviewZones, type SettingsOverviewLens } from './use-settings-overview-zones';

/**
 * The shared composition behind `/settings/overview/{account,project,user}` — each lens rendered
 * from its OWN `dashboards.yaml` entry (converse-frontends#455, story C12; decision D-K).
 *
 * **What changed.** These three lenses used to be one 592-line hook keyed by a `lens` literal,
 * firing four usage queries each (day, model-day, model-totals, secondary) for five hand-composed
 * zones. What actually differed between them was the SCOPE and one breakdown dimension — which is
 * precisely what a page entry states — so each lens is now its own YAML entry, and this container
 * is the chrome plus the zones that are not usage queries. Eight panels resolve to TWO requests.
 *
 * This component still takes `lens` alongside the spec, because the two hand-written zones are
 * lens-conditional in a way the spec cannot express (`burnDown` is the account lens's, `pressure`
 * the project lens's) and because the "select a project first" gate belongs to one lens only.
 *
 * **Divergences from the hand-written lenses, deliberate and named:**
 *  - Spend over time is a LINE, not bars. The engine has one series shape (`MultiSeriesSpendBoard`,
 *    with the Linear/Log/Indexed toggle every other declarative page carries); a second, bars-only
 *    renderer existing solely for these three lenses would be the hand-written container coming
 *    back through the registry. The data is identical.
 *  - Bucket width follows the range (`bucket: auto`) rather than always being one day, so a 7-day
 *    window now reads hourly instead of as seven columns.
 *  - "Cost / request" is a DASH when the window carries no requests, where the hook printed
 *    `$0.00` — see `costPerRequest`'s own doc comment.
 *  - Each lens gains a "Models in use" stat, off the grouped query it already fires.
 */

export interface SettingsOverviewCentreProps {
  lens: SettingsOverviewLens;
  /** The validated entry for THIS lens's route, read from `dashboards.yaml` by the route's server
   *  component (`/settings/overview/account`, `…/project`, `…/user`). */
  page: DashboardPageSpec;
}

export function SettingsOverviewCentre({ lens, page }: SettingsOverviewCentreProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const labels = rangeLabels(tCommon);
  const [view, setView] = useSettingsOverviewParams();
  const zones = useSettingsOverviewZones(lens);
  const localLabels = useDashboardLabels({
    projectId: lens === 'project' ? zones.scopeId : null,
  });

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  // One `$param` per lens, named to match its own YAML entry. Only the one this lens declares is
  // ever read; supplying all three keeps this container free of a lens→placeholder lookup table.
  const filters = useMemo(
    () => ({ accountId: zones.scopeId, projectId: zones.scopeId, sub: zones.scopeId }),
    [zones.scopeId]
  );

  const knobs = useDashboardKnobs(page);

  const dashboard = useDashboard({
    page,
    window,
    filters,
    ...knobs,
    localLabels,
    // Never fired unscoped: the project lens has no project until one is picked, and the user lens
    // no subject until the session resolves.
    enabled: zones.ready,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={zones.title}
        subtitle={zones.subtitle}
        controls={
          <div className="flex flex-wrap items-end gap-3">
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
            {zones.projectField ? (
              <SelectField {...zones.projectField} layout="inline" hideLabel />
            ) : null}
          </div>
        }
        // The same one export component every YAML-driven page composes (converse-frontends#453):
        // it takes this lens's route, window and filter values, and `/api/reports/page` re-resolves
        // that entry server-side. Suppressed until the lens is scoped — a report of a page that
        // fired no query would be a document of unavailable panels.
        action={
          zones.ready ? (
            <DashboardExportButton
              route={page.route}
              title={zones.title}
              range={view.range}
              rangeLabel={labels[view.range]}
              window={window}
              from={view.from}
              to={view.to}
              filters={filters}
            />
          ) : undefined
        }
      />

      {!zones.ready ? (
        <InlineStatus>
          {lens === 'project' ? t('overview.select-project') : t('overview.resolving-identity')}
        </InlineStatus>
      ) : (
        <>
          <DashboardRenderer state={dashboard} />

          {/* The zones that are not usage queries over this range — see
              `use-settings-overview-zones.ts`. They come AFTER the grid here (unlike
              `/admin/overview`, where the operator's act-on-it zones lead) because on a lens the
              analytics ARE the page; the budget zones are the standing context beneath them. */}
          {zones.burnDown || zones.adminPressure || zones.adminHygiene ? (
            <DashboardGrid>
              {zones.burnDown ? (
                <Card data-span="2">
                  <SpendDashboard
                    label={t('overview.burn-down.label')}
                    series={zones.burnDown.series}
                    status={zones.burnDown.status}
                    cumulative
                    ceiling={zones.burnDown.ceiling ?? undefined}
                    fallbackWidth={1120}
                    height={200}
                    formatYTick={formatUsdAxis}
                    formatTooltipValue={formatUsd}
                  />
                  {/* Still English — the same composed cadence sentence `/admin/overview` shows
                      (converse-frontends#479); see ADR 0017's "What is not translated yet". */}
                  <InlineStatus className="mt-2">{zones.budgetPeriodCaption}</InlineStatus>
                </Card>
              ) : null}

              {zones.adminPressure ? (
                <Card data-span="2">
                  <BudgetPressure
                    label={t('overview.pressure.label')}
                    projects={zones.adminPressure.projects}
                    ceiling={zones.adminPressure.ceiling}
                    status={zones.adminPressure.status}
                    errorMessage={zones.adminPressure.errorMessage}
                    onRetry={zones.adminPressure.onRetry}
                    note={zones.adminPressure.note}
                  />
                </Card>
              ) : null}

              {zones.adminHygiene ? (
                <Card data-span="2" title={t('overview.hygiene.title')}>
                  <InlineStatus>{zones.adminHygiene.summary}</InlineStatus>
                  <ApiKeysHygieneNotes className="mt-3" hygiene={zones.adminHygiene.hygiene} />
                  {zones.adminHygiene.caveat ? (
                    <InlineStatus className="mt-2">{zones.adminHygiene.caveat}</InlineStatus>
                  ) : null}
                </Card>
              ) : null}
            </DashboardGrid>
          ) : null}
        </>
      )}
    </div>
  );
}
