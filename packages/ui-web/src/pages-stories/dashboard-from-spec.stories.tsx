import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { parse as parseYaml } from 'yaml';

// The REAL checked-in document, read as text — "the fixture path IS the YAML"
// (converse-frontends#446). Not a copy: a copy is what would drift, and a story rendering a copy
// would certify a page nobody ships. This is a DATA import; nothing here imports `apps/console`
// code, so the package dependency direction is unchanged (see `src/vite-raw-imports.d.ts`).
import dashboardsYaml from '../../../../apps/console/dashboards.yaml?raw';

import { ConsoleShell } from '../components/console-shell';
import type { MultiSeriesSpendScale } from '../components/multi-series-spend-chart';
import { PageHeader } from '../sections/page-header';
import { DashboardGrid } from '../sections/dashboard-grid';
import { DashboardPanel } from '../sections/dashboard-panel';
import { panelFixtures } from '../sections/dashboard-panels/fixtures';
import { renderPanelActions, renderPanelBody } from '../sections/dashboard-panels/panel-renderers';
import { DASHBOARD_PANEL_TYPES, panelChrome } from '../sections/dashboard-panels/types';
import type { DashboardPanelType, DashboardPanelView } from '../sections/dashboard-panels/types';
import { storySidebar, storyTopBar } from './shell-fixtures';

/**
 * **`Pages/FromSpec`** — the story the declarative engine exists for.
 *
 * It renders a page entry straight out of `apps/console/dashboards.yaml` against a MOCKED query
 * layer (`panelFixtures`), through the same `DashboardGrid` / `DashboardPanel` / renderer registry
 * `apps/console`'s `dashboard-renderer.tsx` uses. Two consequences the epic asks for by name:
 *
 *  - A page is reviewable **before its backend column exists** — `/admin/usage` names dimensions
 *    (`azp`, `operation`, `billing_plan`) that lane A3 has not landed. The layout, the panel mix
 *    and the density are all reviewable today regardless.
 *  - Adding a panel to a page is adding YAML. Add an entry to that file, reload this story, and
 *    the panel is there — no story edit, no container.
 *
 * The mocked layer is deliberately per-TYPE rather than per-panel: what a reviewer is judging here
 * is the page's shape and rhythm, and giving every `ranked` panel the same realistic top-1-dominant
 * fixture is what makes two ranked panels side by side comparable. Real per-panel data is the
 * console's job, and its adapters are covered by their own unit tests.
 *
 * Validation is the console's (`dashboard-spec.test.ts` runs the real zod schema over this exact
 * file, and the loader fails loud at startup). This story only narrows the shape it needs to draw,
 * and says so plainly rather than half-reimplementing the schema.
 */

interface SpecPanel {
  id: string;
  type: DashboardPanelType;
  title: string;
  subtitle?: string;
  span?: 1 | 2;
}

interface SpecPage {
  route: string;
  panels: SpecPanel[];
}

function readPages(text: string): SpecPage[] {
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
        return {
          id: String(p.id),
          type,
          title: String(p.title),
          subtitle: p.subtitle === undefined ? undefined : String(p.subtitle),
          span: p.span === 2 ? 2 : 1,
        };
      }),
    };
  });
}

const pages = readPages(dashboardsYaml);

function SpecPageView({ page }: { page: SpecPage }) {
  const [scale, setScale] = useState<MultiSeriesSpendScale>('linear');

  const views = useMemo(() => {
    const map = new Map<string, DashboardPanelView>();
    for (const panel of page.panels) {
      const fixture = panelFixtures[panel.type];
      map.set(
        panel.id,
        fixture.kind === 'series' || fixture.kind === 'latency-series'
          ? { ...fixture, scale, onScaleChange: setScale }
          : fixture
      );
    }
    return map;
  }, [page, scale]);

  return (
    <>
      <PageHeader
        title={page.route}
        subtitle={`${page.panels.length} panels from dashboards.yaml · mocked query layer`}
      />
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
    </>
  );
}

/** Inside the real shell, because a dashboard's density is only judgeable against the rails and
 *  the content column it actually renders in (console-ui skill "Composition"). */
function ShelledPage({ page }: { page: SpecPage }) {
  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <SpecPageView page={page} />
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/FromSpec',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const firstPage = pages[0];

export const AdminUsage: StoryObj = {
  name: firstPage ? firstPage.route : 'no pages in dashboards.yaml',
  render: () =>
    firstPage ? <ShelledPage page={firstPage} /> : <p>dashboards.yaml has no pages.</p>,
};

export const AdminUsageLight: StoryObj = {
  name: `${firstPage?.route ?? 'page'} — wireframe (light)`,
  render: AdminUsage.render,
  globals: { theme: 'wireframe' },
};

/** The one-column tier: every panel is full width, `span: 2` included. */
export const AdminUsageMobile: StoryObj = {
  name: `${firstPage?.route ?? 'page'} — base 390`,
  render: AdminUsage.render,
  globals: { viewport: { value: 'base390' } },
};

/** Panels only, no shell — the density review surface for the grid itself. */
export const PanelsOnly: StoryObj = {
  name: `${firstPage?.route ?? 'page'} — panels only`,
  parameters: { layout: 'padded' },
  render: () =>
    firstPage ? <SpecPageView page={firstPage} /> : <p>dashboards.yaml has no pages.</p>,
};
