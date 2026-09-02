'use client';

import React from 'react';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { DashboardPanel } from '@lightbridge/ui-web/src/sections/dashboard-panel';
import {
  DASHBOARD_PANEL_TYPES,
  panelActionRenderers,
  panelChrome,
  panelRenderers,
  renderPanelActions,
  renderPanelBody,
} from '@lightbridge/ui-web/src/sections/dashboard-panels';

import type { DashboardPanelState, DashboardState } from './use-dashboard';

/**
 * The renderer half of the declarative dashboard engine (converse-frontends#446, decision D-K):
 * a `DashboardState` (from `use-dashboard.ts`) becomes a `DashboardGrid` of `DashboardPanel`s,
 * each drawn by the registry entry for its type.
 *
 * **`panelRenderers` is re-exported here rather than redeclared.** It lives in `packages/ui-web`
 * because Storybook runs there and the epic's acceptance surface is "one story per panel type,
 * plus a `Pages/FromSpec` story that renders a real YAML page entry" — a registry the stories
 * could not import would have to be mirrored by a story-local copy, and the copy is what would
 * drift. There is exactly one map, covering all nine types, and
 * `dashboard-renderer.test.tsx` asserts its keys against the spec schema's own enum from the
 * other side of the boundary.
 *
 * Per-panel state, never page-level: a panel whose query failed renders `ErrorLine` inside its own
 * card while every other panel renders its data (an explicit AC). Loading is a skeleton of the
 * body's own geometry, not a spinner and not a disappearing card — the card, its title and its
 * Expand button stay put, so the page does not reflow when data lands.
 */

export { panelRenderers, panelActionRenderers, DASHBOARD_PANEL_TYPES };

export interface DashboardRendererProps {
  state: DashboardState;
  className?: string;
}

export function DashboardRenderer({ state, className }: DashboardRendererProps) {
  return (
    <DashboardGrid className={className}>
      {state.panels.map((panel) => (
        <DashboardPanelSlot key={panel.id} panel={panel} />
      ))}
    </DashboardGrid>
  );
}

function DashboardPanelSlot({ panel }: { panel: DashboardPanelState }) {
  return (
    <DashboardPanel
      id={panel.id}
      title={panel.title}
      subtitle={panel.subtitle}
      span={panel.span}
      // `stat`/`stat-group` bodies panel themselves (console-ui skill) — `panelChrome` is the one
      // place that list lives, so the console and Storybook cannot disagree about it.
      chrome={panelChrome(panel.type)}
      actions={panel.view ? renderPanelActions(panel.view, 'panel') : null}>
      {({ size }) => {
        if (panel.status === 'error') {
          return (
            <ErrorLine
              message={panel.errorMessage ?? 'Failed to load this panel.'}
              onRetry={panel.onRetry}
              retryLabel="Retry"
            />
          );
        }
        if (panel.status === 'loading' || !panel.view) {
          return <SkeletonMetric />;
        }
        return renderPanelBody(panel.view, size);
      }}
    </DashboardPanel>
  );
}
