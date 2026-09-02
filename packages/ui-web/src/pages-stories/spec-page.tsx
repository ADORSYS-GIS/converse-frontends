import React, { useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';

// The REAL checked-in document, read as text — "the fixture path IS the YAML"
// (converse-frontends#446). Not a copy: a copy is what would drift, and a story rendering a copy
// would certify a page nobody ships. This is a DATA import; nothing here imports `apps/console`
// code, so the package dependency direction is unchanged (see `src/vite-raw-imports.d.ts`).
import dashboardsYaml from '../../../../apps/console/dashboards.yaml?raw';

import type { MultiSeriesSpendScale } from '../components/multi-series-spend-chart';
import { DashboardGrid } from '../sections/dashboard-grid';
import { DashboardPanel } from '../sections/dashboard-panel';
import { panelFixtures } from '../sections/dashboard-panels/fixtures';
import { renderPanelActions, renderPanelBody } from '../sections/dashboard-panels/panel-renderers';
import { DASHBOARD_PANEL_TYPES, panelChrome } from '../sections/dashboard-panels/types';
import type { DashboardPanelType, DashboardPanelView } from '../sections/dashboard-panels/types';

/**
 * The shared machinery behind every page story that renders a `dashboards.yaml` entry against a
 * MOCKED query layer — `Pages/FromSpec` and `Pages/AdminOverview` both go through this.
 *
 * It exists so the two cannot disagree about what a YAML page looks like. `Pages/AdminOverview` is
 * the parity oracle for the C4 migration (converse-frontends#447): it must render the SAME panel
 * mix, in the same order, at the same densities as the engine draws in `apps/console`, or it
 * certifies nothing.
 *
 * The mocked layer is deliberately per-TYPE rather than per-panel: what a reviewer judges here is
 * the page's shape and rhythm, and giving every `ranked` panel the same realistic top-1-dominant
 * fixture is what makes two of them side by side comparable. Real per-panel data is the console's
 * job, and its adapters have their own unit tests.
 *
 * Validation is the console's (`dashboard-spec.test.ts` runs the real zod schema over this exact
 * file, and the loader fails loud at startup). This module only narrows the shape it needs to
 * draw, and says so plainly rather than half-reimplementing the schema.
 */

export interface SpecPanel {
  id: string;
  type: DashboardPanelType;
  title: string;
  subtitle?: string;
  span?: 1 | 2;
  /** `table` only — what a row IS and what to count them in. Read here (rather than left to the
   *  per-type fixture) because a table of accounts headed "Actor" is exactly the kind of quiet
   *  mislabelling this story exists to catch. */
  rowLabel?: string;
  unit?: string;
  /** `compare: true` — the panel carries a previous-window overlay. */
  compare?: boolean;
}

export interface SpecPage {
  route: string;
  panels: SpecPanel[];
}

export function readPages(text: string = dashboardsYaml): SpecPage[] {
  const document = parseYaml(text) as { pages?: unknown } | null;
  const pages = Array.isArray(document?.pages) ? document.pages : [];
  return pages.map((page) => {
    const entry = page as { route?: unknown; panels?: unknown };
    const panels = Array.isArray(entry.panels) ? entry.panels : [];
    return {
      route: String(entry.route ?? '(unnamed page)'),
      panels: panels.map((panel) => {
        const p = panel as Record<string, unknown>;
        const type = String(p.type) as DashboardPanelType;
        if (!DASHBOARD_PANEL_TYPES.includes(type)) {
          // Never a silent skip — the same rule the schema enforces, restated visibly here so a
          // reviewer looking at the story sees the failure rather than a missing card.
          throw new Error(`Unknown panel type "${String(p.type)}" on ${String(entry.route)}`);
        }
        const options = (p.options ?? {}) as Record<string, unknown>;
        return {
          id: String(p.id),
          type,
          title: String(p.title),
          subtitle: p.subtitle === undefined ? undefined : String(p.subtitle),
          span: p.span === 2 ? 2 : 1,
          rowLabel: options.rowLabel === undefined ? undefined : String(options.rowLabel),
          unit: options.unit === undefined ? undefined : String(options.unit),
          compare: p.compare === true,
        };
      }),
    };
  });
}

/** Every page entry in the checked-in document, in file order. */
export const specPages = readPages();

/** One page by its route. Throws rather than rendering an empty grid — a story that silently
 *  drew nothing would be the worst possible parity oracle. */
export function specPage(route: string): SpecPage {
  const page = specPages.find((entry) => entry.route === route);
  if (!page) throw new Error(`dashboards.yaml has no entry for "${route}"`);
  return page;
}

/** The panels of one YAML page, in `DashboardGrid`, drawn by the real renderer registry. */
export function SpecPanels({ page }: { page: SpecPage }) {
  const [scale, setScale] = useState<MultiSeriesSpendScale>('linear');

  const views = useMemo(() => {
    const map = new Map<string, DashboardPanelView>();
    for (const panel of page.panels) {
      const fixture = panelFixtures[panel.type];
      if (fixture.kind === 'series' || fixture.kind === 'latency-series') {
        // A `compare: true` panel's last line is the previous window, DASHED — the console's own
        // adapter appends exactly that (`comparisonSeries`), and it is the whole reading of the
        // panel, so a story that drew four ordinary lines would be reviewing the wrong chart.
        const series =
          panel.compare && fixture.series.length > 1
            ? fixture.series.map((s, index) =>
                index === fixture.series.length - 1
                  ? { ...s, label: 'Previous period', dashed: true }
                  : s
              )
            : fixture.series;
        map.set(panel.id, { ...fixture, series, scale, onScaleChange: setScale });
      } else if (fixture.kind === 'stat') {
        // The panel's TITLE is the stat's label in the console (`statView`), because a bare stat
        // panel has no heading row of its own — so the fixture's own label must not stand in for
        // it, or every stat on the page reads "Total cost".
        map.set(panel.id, { ...fixture, label: panel.title });
      } else if (fixture.kind === 'table' && (panel.rowLabel || panel.unit)) {
        map.set(panel.id, {
          ...fixture,
          columns: fixture.columns.map((column, index) =>
            index === 0 && panel.rowLabel ? { ...column, header: panel.rowLabel } : column
          ),
          unit: panel.unit ?? fixture.unit,
        });
      } else {
        map.set(panel.id, fixture);
      }
    }
    return map;
  }, [page, scale]);

  return (
    <DashboardGrid>
      {page.panels.map((panel) => {
        const view = views.get(panel.id);
        if (!view) return null;
        return (
          <DashboardPanel
            key={panel.id}
            id={panel.id}
            title={panel.title}
            subtitle={panel.subtitle}
            span={panel.span}
            chrome={panelChrome(panel.type)}
            actions={renderPanelActions(view, 'panel')}>
            {({ size }) => renderPanelBody(view, size)}
          </DashboardPanel>
        );
      })}
    </DashboardGrid>
  );
}
