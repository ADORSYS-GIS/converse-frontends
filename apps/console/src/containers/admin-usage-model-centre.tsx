'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useAdminUsageWindowParams } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { ADMIN_USAGE_ROUTE } from '../dashboards/usage-routes';
import { useTranslation } from '../i18n/client';
import { rangeLabels, rangePresets } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';

/**
 * `/admin/usage/models/[model]` — ONE model's usage across the estate, rendered entirely from
 * `dashboards.yaml` (converse-frontends#449, owner feedback 2026-09-03).
 *
 * **This page cost one YAML entry and this file, and this file is almost entirely NOT about
 * panels.** Eight panels — three compared totals, a cost series, two rankings that continue the
 * drill path into actors and channels, a latency card and an operation breakdown — are declared in
 * the document; what is left here is the three things a PAGE owns and a panel cannot: its window,
 * its identity (the header), and its way back.
 *
 * **The header IS the model string, and that is deliberate** — the same ruling
 * `admin-usage-channel-centre.tsx` states for an `azp`. A model name is what the gateway recorded
 * and what an operator will match against a provider's own model list; prettifying `gpt-4o` into
 * "GPT-4o" would be a name this console made up, and it would stop matching the value in every
 * chart on the page it was opened from.
 *
 * There is no lens knob and no `resetCadence` of its own: a model spans every account, so no single
 * reset schedule governs it and "vs previous" falls back to the monthly default the engine already
 * uses for estate windows (decision D-F, owner Q8).
 */

export interface AdminUsageModelCentreProps {
  /** The validated `/admin/usage/models/[model]` entry from `dashboards.yaml`. */
  page: DashboardPageSpec;
  /** The path segment, already percent-decoded by the ROUTE (`decodeRouteParam`) — the real model
   *  string, not the encoded segment Next hands a page. */
  model: string;
}

export function AdminUsageModelCentre({ page, model }: AdminUsageModelCentreProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const labels = rangeLabels(tCommon);
  const [view, setView] = useAdminUsageWindowParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const knobs = useDashboardKnobs(page);

  // The one `$param` every panel's `filters.model` resolves from.
  const filters = useMemo(() => ({ model }), [model]);

  const dashboard = useDashboard({
    page,
    window,
    filters,
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
        title={model}
        subtitle={t('usage.model.subtitle', {
          range: labels[view.range],
          timezone: tCommon('timezone.utc'),
        })}
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
            {/* The way back to the ring or share row this page was opened from. A real anchor
                rather than a history-pop handler: this page is linkable and routinely arrived at by
                pasted URL, where there is no "back" to pop. */}
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={ADMIN_USAGE_ROUTE} />}>
              {tCommon('actions.back-to-usage')}
            </Button>
            <DashboardExportButton
              route={page.route}
              title={model}
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

      {/* The batch identity lookup's own failure line — this page has two actor-grained panels
          (`model-actors` labels users), so it owes the same caption every other page does. */}
      {dashboard.actorLabelsErrorMessage ? (
        <InlineStatus>{dashboard.actorLabelsErrorMessage}</InlineStatus>
      ) : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
