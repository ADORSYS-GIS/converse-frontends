'use client';

import { useMemo } from 'react';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useAdminUsageWindowParams } from '../client/url-state';
import { DashboardExportButton } from '../dashboards/dashboard-export-button';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { AdminUsageSubNav } from './admin-usage-sub-nav';
import { RANGE_DAYS, RANGE_LABELS, resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useAdminEstateOperations } from './use-admin-estate-operations';

/**
 * `/admin/usage/chats` — the estate's chat-shaped operations (converse-frontends#449, story C6).
 *
 * A LENS on `/admin/usage`, not a sibling area: every panel asks the same estate question with
 * `operation_in: [chat_completions, responses, messages]` applied — A3's one set-membership filter
 * (lightbridge-authz#648) — which is why it lives behind this page's own tab row rather than a
 * sixth admin rail row (`AdminUsageSubNav`).
 *
 * **The latency series is the one genuinely new reading**, and it is honest: the usage backend
 * computes `percentile_cont` per bucket GROUP at query time, so each plotted p50/p95 point is a
 * real percentile of that bucket's own samples. ADR 0013 D5's "latency is stat cards until history
 * depth justifies a series" is amended on exactly that ground (C11 carries the write-up); the
 * `latency-cards` panel beside it still states the WORST bucket for the window rather than a mean,
 * because an average of percentiles is not a percentile of anything.
 *
 * The comparison cadence is the estate's, the same one `/admin/usage` uses — the global schedule's
 * if one governs the estate, else monthly (decision D-F, owner Q8).
 */

const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
}));

export interface AdminUsageChatsCentreProps {
  /** The validated `/admin/usage/chats` entry from `dashboards.yaml`. */
  page: DashboardPageSpec;
}

export function AdminUsageChatsCentre({ page }: AdminUsageChatsCentreProps) {
  const [view, setView] = useAdminUsageWindowParams();
  // Only for the comparison cadence the chat-count total measures against. This page draws neither
  // of that hook's zones, exactly as `/admin/usage` does not.
  const operations = useAdminEstateOperations();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const knobs = useDashboardKnobs(page);

  const dashboard = useDashboard({
    page,
    window,
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
        title="Chats"
        subtitle={`Operator · /v1/chat/completions, /v1/responses and /v1/messages · ${RANGE_LABELS[view.range]} · UTC`}
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
        action={
          <DashboardExportButton
            route={page.route}
            title="Chats"
            range={view.range}
            rangeLabel={RANGE_LABELS[view.range]}
            window={window}
            from={view.from}
            to={view.to}
          />
        }
      />

      <AdminUsageSubNav />

      {dashboard.actorLabelsErrorMessage ? (
        <InlineStatus>{dashboard.actorLabelsErrorMessage}</InlineStatus>
      ) : null}

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
