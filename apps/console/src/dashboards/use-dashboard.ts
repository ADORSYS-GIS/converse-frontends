'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { UsageQueryRequest, UsageQueryResponse } from '@lightbridge/api-rest';
import type {
  DashboardPanelType,
  DashboardPanelView,
} from '@lightbridge/ui-web/src/sections/dashboard-panels';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart';

import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import type { ResetCadence, UsageWindow } from '../containers/comparison-window';
import type { DashboardPageSpec } from './dashboard-spec';
import { toPanelView } from './panel-adapters';
import { queryKey, resolveDashboard } from './resolve-dashboard';
import type { DashboardFilters, ResolvedDashboard, ResolvedQuery } from './resolve-dashboard';

/**
 * The one hook a declarative dashboard page calls (converse-frontends#446, decision D-K).
 *
 * ONE `useQueries` over the DEDUPLICATED query list — not one `useQuery` per board, which is what
 * the deleted `use-admin-overview-screen.ts` did (six hand-declared queries for eight boards,
 * several identical apart from `group_by`, and the genuinely identical ungrouped ones not shared at
 * all). `/admin/overview`'s eleven panels now issue four requests
 * (`dashboards/admin-overview-page.test.ts` pins the count).
 *
 * **One panel's failure never fails the page.** Each panel reads only the query it points at, so a
 * panel whose request errored renders its own error state while its neighbours render their data
 * — an explicit AC, and the reason this returns a per-panel status rather than a single page-level
 * one. `getUsageErrorMessage` turns an axios/zod rejection into wording a person can act on, the
 * same function every other usage screen in this console uses.
 */

export interface DashboardPanelState {
  id: string;
  /** The spec's own `type`. Carried through (rather than read off `view.kind`) because the panel's
   *  CHROME depends on it and must be stable across loading/error/ready — deriving it from a view
   *  that only exists once data lands would make the page relayout as each panel resolves. */
  type: DashboardPanelType;
  title: string;
  subtitle?: string;
  span: 1 | 2;
  status: 'loading' | 'error' | 'ready';
  /** Present only when `status === 'ready'`. */
  view?: DashboardPanelView;
  errorMessage?: string;
  onRetry: () => void;
}

export interface DashboardState {
  panels: DashboardPanelState[];
  /** The resolved plan — exported so a page can caption its own window/limits honestly, and so a
   *  test can assert the dedupe without rendering. */
  resolved: ResolvedDashboard;
  /** How many requests the page actually issued. Equal to `resolved.queries.length`; surfaced so
   *  the "N panels → M requests" claim is checkable rather than asserted in a comment. */
  requestCount: number;
}

export interface UseDashboardInput {
  page: DashboardPageSpec;
  window: UsageWindow;
  filters?: DashboardFilters;
  resetCadence?: ResetCadence;
  /**
   * The controlled scale for ONE series panel, or `undefined` to take the panel's own YAML
   * default (`options.scale`, else `linear`).
   *
   * Per panel, not per page: `/admin/overview`'s boards do not agree on an axis transform and
   * never did — request VOLUME defaults to `indexed`, the model mix to `log`, spend to the honest
   * raw `linear` — and each is a separate `?*-scale` URL knob (ADR 0011). A single page-level
   * value would either lose those defaults or force every board onto one transform.
   */
  scaleFor: (panelId: string) => MultiSeriesSpendScale | undefined;
  onScaleChange: (panelId: string, scale: MultiSeriesSpendScale) => void;
  /** Suspends every request — used while a route param the placeholders need is still resolving. */
  enabled?: boolean;
}

/**
 * The wire cast, in exactly one place and with its reason.
 *
 * `ResolvedQuery` types `scope`/`group_by`/`filters` as plain strings so a page can name a
 * dimension lane A3 has not landed yet (`azp`, `operation`, `billing_plan`) and still be
 * authorable and reviewable in Storybook today. The generated `UsageQueryRequest` types them as
 * closed enums. The backend rejects an unknown dimension with a 400 that the panel renders as its
 * own error — which is the correct outcome for "this page names a column your deployment does not
 * have yet", and strictly better than not being able to write the page at all.
 */
function toUsageRequest(query: ResolvedQuery): UsageQueryRequest {
  return {
    scope: query.scope as UsageQueryRequest['scope'],
    scope_id: query.scope_id,
    start_time: query.start_time,
    end_time: query.end_time,
    bucket: query.bucket,
    group_by: query.group_by as UsageQueryRequest['group_by'],
    filters: query.filters as UsageQueryRequest['filters'],
    limit: query.limit,
  };
}

export function useDashboard({
  page,
  window,
  filters,
  resetCadence,
  scaleFor,
  onScaleChange,
  enabled = true,
}: UseDashboardInput): DashboardState {
  const resolved = useMemo(
    () => resolveDashboard({ page, window, filters, resetCadence }),
    [page, window, filters, resetCadence]
  );

  const results = useQueries({
    queries: resolved.queries.map((query) => ({
      // The dedupe key IS the cache key: two pages (or a page and its export) resolving the same
      // query share one cache entry, not two that can disagree.
      queryKey: ['dashboard', resolved.route, queryKey(query)],
      queryFn: () => queryUsage(toUsageRequest(query)),
      staleTime: 30_000,
      enabled,
    })),
  });

  const panels = resolved.panels.map((panel): DashboardPanelState => {
    const base = {
      id: panel.spec.id,
      type: panel.spec.type,
      title: panel.spec.title,
      subtitle: panel.spec.subtitle,
      span: panel.spec.span,
      onRetry: () => {
        void results[panel.queryIndex]?.refetch();
        if (panel.compareQueryIndex !== undefined) {
          void results[panel.compareQueryIndex]?.refetch();
        }
      },
    };

    const primary = results[panel.queryIndex];
    if (!primary || primary.isPending) return { ...base, status: 'loading' };
    if (primary.isError) {
      return { ...base, status: 'error', errorMessage: getUsageErrorMessage(primary.error) };
    }

    // A comparison twin that failed does NOT fail the panel: the figure itself is real, only the
    // delta is unknown, and a panel that renders its number without a delta is honest where one
    // that renders an error is not.
    const compare =
      panel.compareQueryIndex !== undefined ? results[panel.compareQueryIndex] : undefined;
    const compareResponse =
      compare && !compare.isPending && !compare.isError
        ? (compare.data as UsageQueryResponse)
        : undefined;

    return {
      ...base,
      status: 'ready',
      view: toPanelView({
        spec: panel.spec,
        response: primary.data as UsageQueryResponse,
        compareResponse,
        compareCadence: compareResponse ? panel.compareCadence : undefined,
        compareShiftMs: compareResponse ? panel.compareShiftMs : undefined,
        scale: scaleFor(panel.spec.id) ?? panel.spec.options?.scale ?? 'linear',
        onScaleChange: (next) => onScaleChange(panel.spec.id, next),
      }),
    };
  });

  return { panels, resolved, requestCount: resolved.queries.length };
}
