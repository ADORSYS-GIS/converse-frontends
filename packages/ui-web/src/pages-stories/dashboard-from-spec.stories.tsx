import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleShell } from '../components/console-shell';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPage } from './spec-page';
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
 * `/admin/overview` has its own story (`Pages/AdminOverview`) rather than appearing here, because
 * that page also carries two hand-written, RPC-backed zones the YAML cannot describe — and the
 * whole point of that story is reviewing the page as an operator actually sees it. Both go through
 * `spec-page.tsx`, so neither can drift from what the console draws.
 */

const PAGE: SpecPage = specPage('/admin/usage');

function SpecPageView({ page }: { page: SpecPage }) {
  return (
    <>
      <PageHeader
        title={page.route}
        subtitle={`${page.panels.length} panels from dashboards.yaml · mocked query layer`}
      />
      <SpecPanels page={page} />
    </>
  );
}

/** Inside the real shell, because a dashboard's density is only judgeable against the rails and
 *  the content column it actually renders in (console-ui skill "Composition"). */
function ShelledPage({ page }: { page: SpecPage }) {
  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <SpecPageView page={page} />
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Dashboard/FromSpec',
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const AdminUsage: StoryObj = {
  name: PAGE.route,
  render: () => <ShelledPage page={PAGE} />,
};

export const AdminUsageLight: StoryObj = {
  name: `${PAGE.route} — wireframe (light)`,
  render: AdminUsage.render,
  globals: { theme: 'wireframe' },
};

/** The one-column tier: every panel is full width, `span: 2` included. */
export const AdminUsageMobile: StoryObj = {
  name: `${PAGE.route} — base 390`,
  render: AdminUsage.render,
  globals: { viewport: { value: 'base390' } },
};

/** Panels only, no shell — the density review surface for the grid itself. */
export const PanelsOnly: StoryObj = {
  name: `${PAGE.route} — panels only`,
  parameters: { layout: 'padded' },
  render: () => <SpecPageView page={PAGE} />,
};
