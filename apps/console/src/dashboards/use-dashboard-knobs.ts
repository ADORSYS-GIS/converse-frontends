'use client';

import { useCallback, useMemo } from 'react';
import type { LedgerSort } from '@lightbridge/ui-web/src/components/ledger-table';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart';

import {
  dashboardDirKey,
  dashboardPageKey,
  dashboardScaleKey,
  dashboardSortKey,
  useDashboardScaleParams,
  useDashboardTableParams,
} from '../client/url-state';
import type { DashboardPageSpec } from './dashboard-spec';

/**
 * Every per-PANEL URL knob a `dashboards.yaml` page owns — the axis transform on each series
 * panel, and the sort/page on each table — declared FROM the spec and handed back in exactly the
 * shape `useDashboard` takes (converse-frontends#449, story C6).
 *
 * **Why this exists.** `/admin/usage` wrote these six callbacks by hand, and C6 adds three more
 * pages that need the identical six. Copying them would mean four places that each have to
 * remember that re-sorting returns to page 1, that an absent `?…-sort=` means "the adapter's own
 * default order" rather than a hardcoded one, and that the knob list is DATA — a deployment can
 * add or remove a panel through the config-volume override (owner ruling Q11) without a rebuild,
 * so a fixed list would leave an override-added panel's toggle steering nothing.
 *
 * It stays a thin binding of the two `url-state.ts` hooks rather than a second URL vocabulary:
 * the param NAMES (`<panel-id>-scale`, `-sort`, `-dir`, `-page`) are still stated once, there.
 */

export interface DashboardKnobs {
  scaleFor: (panelId: string) => MultiSeriesSpendScale | undefined;
  onScaleChange: (panelId: string, scale: MultiSeriesSpendScale) => void;
  sortFor: (panelId: string) => LedgerSort | undefined;
  onSortChange: (panelId: string, sort: LedgerSort) => void;
  pageFor: (panelId: string) => number;
  onPageChange: (panelId: string, page: number) => void;
  /** The page's table panels — a caller that changes what the rows ARE (a lens switch) resets
   *  their cursors with `resetTablePages`, because page 4 of a different ordering shows rows that
   *  have nothing to do with either view. */
  tablePanelIds: string[];
  resetTablePages: () => void;
}

export function useDashboardKnobs(page: DashboardPageSpec): DashboardKnobs {
  // Both series-shaped types render a scale toggle, so both get a knob.
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

  const resetTablePages = useCallback(() => {
    void setTables(Object.fromEntries(tablePanelIds.map((id) => [dashboardPageKey(id), 0])));
  }, [setTables, tablePanelIds]);

  return {
    scaleFor,
    onScaleChange,
    sortFor,
    onSortChange,
    pageFor,
    onPageChange,
    tablePanelIds,
    resetTablePages,
  };
}
