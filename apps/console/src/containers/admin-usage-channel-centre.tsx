'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
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
 * `/admin/usage/channels/[channelId]` — ONE OAuth client's usage, rendered entirely from
 * `dashboards.yaml` (converse-frontends#449, story C6).
 *
 * **The header IS the azp string, and that is deliberate.** A channel has no profile to resolve:
 * `azp` is the OAuth client id the gateway stamped on the request (lane A3's bridge column), and
 * there is no procedure that maps one to a display name. Printing it verbatim is the honest
 * reading — inventing "Console UI" for `console-ui` would be a name this console made up, and the
 * id is what an operator will match against the IdP's own client list anyway.
 *
 * There is no lens on this page and no `resetCadence` of its own: a channel spans every account,
 * so no single reset schedule governs it and "vs previous" falls back to the monthly default the
 * engine already uses for estate windows (decision D-F, owner Q8).
 */

export interface AdminUsageChannelCentreProps {
  /** The validated `/admin/usage/channels/[channelId]` entry from `dashboards.yaml`. */
  page: DashboardPageSpec;
  /** The path segment, already percent-decoded by the ROUTE (`decodeRouteParam`) — the real `azp`
   *  value, not the encoded segment Next hands a page. */
  channelId: string;
}

export function AdminUsageChannelCentre({ page, channelId }: AdminUsageChannelCentreProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const labels = rangeLabels(tCommon);
  const [view, setView] = useAdminUsageWindowParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const knobs = useDashboardKnobs(page);

  // The one `$param` every panel's `filters.azp` resolves from.
  const filters = useMemo(() => ({ channelId }), [channelId]);

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
        title={channelId}
        subtitle={t('usage.channel.subtitle', {
          range: labels[view.range],
          timezone: tCommon('timezone.utc'),
        })}
        action={
          /* The way back to the row this page was opened from. A real anchor rather than a
             history-pop handler: this page is linkable and routinely arrived at by pasted URL,
             where there is no "back" to pop. Navigation, so it stays on the title row — the
             control row below is parameters only. */
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={ADMIN_USAGE_ROUTE} />}>
            {tCommon('actions.back-to-usage')}
          </Button>
        }
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
                title={channelId}
                range={view.range}
                rangeLabel={labels[view.range]}
                window={window}
                from={view.from}
                to={view.to}
                filters={filters}
              />
            ),
          },
        ]}
      />

      {dashboard.actorLabelsErrorMessage ? (
        <InlineStatus>{dashboard.actorLabelsErrorMessage}</InlineStatus>
      ) : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
