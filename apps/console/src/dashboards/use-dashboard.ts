'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { UsageQueryRequest, UsageQueryResponse } from '@lightbridge/api-rest';
import type {
  DashboardPanelType,
  DashboardPanelView,
} from '@lightbridge/ui-web/src/sections/dashboard-panels';
import type { LedgerSort } from '@lightbridge/ui-web/src/components/ledger-table';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart';

import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import type { ResetCadence, UsageWindow } from '../containers/comparison-window';
import { collectActorIds, EMPTY_ACTOR_IDS } from './actor-labels';
import type { DashboardPageSpec } from './dashboard-spec';
import { toPanelView } from './panel-adapters';
import { queryKey, resolveDashboard } from './resolve-dashboard';
import type { DashboardFilters, ResolvedDashboard, ResolvedQuery } from './resolve-dashboard';
import { useActorLabels } from './use-actor-labels';

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
  /**
   * Set only when the backend actually dropped buckets to fit this panel's own `limit`
   * (`UsageQueryResponse.truncated`, lightbridge-authz#578). It NAMES the limit, because "some data
   * is missing" without a number is not something an operator can act on — ADR 0013 D5's
   * "explicit limits and truncation captions", and an explicit AC of story C5.
   */
  truncationCaption?: string;
}

export interface DashboardState {
  panels: DashboardPanelState[];
  /** The resolved plan — exported so a page can caption its own window/limits honestly, and so a
   *  test can assert the dedupe without rendering. */
  resolved: ResolvedDashboard;
  /** How many requests the page actually issued. Equal to `resolved.queries.length`; surfaced so
   *  the "N panels → M requests" claim is checkable rather than asserted in a comment. */
  requestCount: number;
  /** Set only when the ONE batched `resolveActorLabels` call failed — the page captions it, and
   *  every actor row falls back to its labelled sentinel rather than disappearing. */
  actorLabelsErrorMessage?: string;
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
  /**
   * Per-TABLE sort and page, held in the URL by the caller for the same reason the scale knobs are
   * (ADR 0011: a shared link must restore the exact view). Per panel, not per page: a screen can
   * carry two tables — `/admin/usage` carries actors and channels — and one sort key steering both
   * would mean sorting one table silently re-sorted the other.
   *
   * Optional as a pair: a page with no table (or one that does not care to make its order
   * shareable) omits both and gets the default cost-descending order and page 0.
   */
  sortFor?: (panelId: string) => LedgerSort | undefined;
  onSortChange?: (panelId: string, sort: LedgerSort) => void;
  pageFor?: (panelId: string) => number;
  onPageChange?: (panelId: string, page: number) => void;
  /** Suspends every request — used while a route param the placeholders need is still resolving. */
  enabled?: boolean;
}

/** The caption a `truncated: true` response gets, naming the panel's own limit. */
export function truncationCaption(limit: number): string {
  return (
    `Showing the most recent ${limit.toLocaleString('en-US')} time buckets — older buckets in ` +
    'this window were dropped to fit the query limit, so totals here are lower than the true ' +
    'period totals. Narrow the range for a complete reading.'
  );
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
  sortFor,
  onSortChange,
  pageFor,
  onPageChange,
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

  /**
   * ONE actor-label lookup for the whole page, over every id every panel's response carries.
   *
   * Collected from the RESPONSES rather than declared per panel, because which actors a window
   * contains is not knowable until the data lands — and gathering them here, once, is what keeps
   * `/admin/usage`'s five actor-grained panels plus a two-hundred-row table on a single
   * `resolveActorLabels` call instead of an N+1. `results` is memo-keyed on the query list, so the
   * lookup re-runs when the data changes and not on every paint.
   */
  const responsesKey = results
    .map((result) => (result.isSuccess ? result.dataUpdatedAt : 0))
    .join(',');
  const actorIds = useMemo(
    () =>
      enabled
        ? collectActorIds(
            results.map((result) =>
              result.isSuccess ? (result.data as UsageQueryResponse) : undefined
            )
          )
        : EMPTY_ACTOR_IDS,
    // `results` is a fresh array every render; `responsesKey` changes exactly when a response does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [responsesKey, enabled]
  );
  const actorLabels = useActorLabels(actorIds);

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

    const response = primary.data as UsageQueryResponse;
    const query = resolved.queries[panel.queryIndex];

    return {
      ...base,
      status: 'ready',
      // Named, not implied: the caption states the panel's OWN limit, which is the number the YAML
      // author set and the only one that explains what was dropped.
      truncationCaption: response.truncated ? truncationCaption(query.limit) : undefined,
      view: toPanelView({
        spec: panel.spec,
        response,
        compareResponse,
        compareCadence: compareResponse ? panel.compareCadence : undefined,
        compareShiftMs: compareResponse ? panel.compareShiftMs : undefined,
        scale: scaleFor(panel.spec.id) ?? panel.spec.options?.scale ?? 'linear',
        onScaleChange: (next) => onScaleChange(panel.spec.id, next),
        groupBy: query.group_by,
        lens: panel.lens,
        link: panel.link,
        labelFor: actorLabels.labelFor,
        sort: sortFor?.(panel.spec.id),
        onSortChange: onSortChange ? (next) => onSortChange(panel.spec.id, next) : undefined,
        page: pageFor?.(panel.spec.id),
        onPageChange: onPageChange ? (next) => onPageChange(panel.spec.id, next) : undefined,
      }),
    };
  });

  return {
    panels,
    resolved,
    requestCount: resolved.queries.length,
    actorLabelsErrorMessage: actorLabels.errorMessage,
  };
}
