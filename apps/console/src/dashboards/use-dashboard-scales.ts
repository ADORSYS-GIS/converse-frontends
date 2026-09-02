'use client';

import { useCallback, useMemo } from 'react';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart';

import { dashboardScaleKey, useDashboardScaleParams } from '../client/url-state';
import type { DashboardPageSpec } from './dashboard-spec';

/**
 * One URL axis knob per SERIES panel on a declarative page, declared FROM the page's own spec
 * (converse-frontends#455, story C12 — extracted from `admin-overview-centre.tsx`, which had it
 * inline).
 *
 * Every YAML-driven page needs exactly this, and by C12 there were five of them; a fifth copy of
 * the same three `useMemo`/`useCallback`s is five places the `?<panel-id>-scale=` convention could
 * drift. `useDashboardScaleParams` (`url-state.ts`) still owns the parsers — this only picks the
 * panels that HAVE an axis and adapts the resulting record to the `scaleFor`/`onScaleChange` pair
 * `useDashboard` takes.
 *
 * **No default is applied here.** `null` means "the panel's own YAML `options.scale`", which
 * `useDashboard` reads; stating a default in both places is exactly the drift externalizing the
 * dashboards exists to end.
 */
export interface DashboardScales {
  scaleFor: (panelId: string) => MultiSeriesSpendScale | undefined;
  onScaleChange: (panelId: string, scale: MultiSeriesSpendScale) => void;
}

export function useDashboardScales(page: DashboardPageSpec): DashboardScales {
  // Both series-shaped types, because both render a scale toggle in their panel's actions slot.
  const seriesPanelIds = useMemo(
    () =>
      page.panels
        .filter((panel) => panel.type === 'series' || panel.type === 'latency-series')
        .map((panel) => panel.id),
    [page]
  );
  const [scales, setScales] = useDashboardScaleParams(seriesPanelIds);

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

  return { scaleFor, onScaleChange };
}
