'use client';

import React from 'react';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
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

import { dashboardExpandParsers, useDashboardExpandParams } from '../client/url-state';
import { useTranslation } from '../i18n/client';
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
 *
 * **Which panel is expanded lives in the URL** (`?expand=<panel-id>`, owner directive 2026-09-03 —
 * see `useDashboardExpandParams`). `DashboardPanel` is driven CONTROLLED here rather than left to
 * its own internal flag, which buys three things a local flag cannot: a deep link opens the panel
 * already expanded, a reload keeps it open, and — the reason the directive gave — the dialog's
 * contents are steered by the page's own per-panel knobs, so `?expand=actors-table&actors-table-
 * page=1` opens the table at page 2 and sorting inside the dialog writes the same `-sort`/`-dir`
 * params the panel behind it reads. The `v` hotkey and the Expand button write the param; Esc and
 * the close button clear it.
 */

export { panelRenderers, panelActionRenderers, DASHBOARD_PANEL_TYPES, dashboardExpandParsers };

export interface DashboardRendererProps {
  state: DashboardState;
  className?: string;
}

export function DashboardRenderer({ state, className }: DashboardRendererProps) {
  // ONE subscription for the page, not one per panel: every slot reads the same `?expand=`, and a
  // panel-level hook would mean N nuqs subscriptions re-rendering the whole grid on every open.
  const [expand, setExpand] = useDashboardExpandParams();

  return (
    <DashboardGrid className={className}>
      {state.panels.map((panel) => (
        <DashboardPanelSlot
          key={panel.id}
          panel={panel}
          expanded={expand.panelId === panel.id}
          onExpandedChange={(next) => {
            void setExpand({ panelId: next ? panel.id : '' });
          }}
        />
      ))}
    </DashboardGrid>
  );
}

function DashboardPanelSlot({
  panel,
  expanded,
  onExpandedChange,
}: {
  panel: DashboardPanelState;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { t } = useTranslation('common');
  // A BARE panel has no heading row of its own — its title is the `StatCard`'s own label, which
  // only exists once the data lands (`DashboardPanelProps.chrome`). So while it is loading or
  // failed, the panel would carry no title at all: a column of six identical "the usage service
  // did not answer" lines with nothing saying WHICH reading is missing. The title is restated here,
  // for those states only, rather than always — a carded panel already has one, and a ready stat
  // would then print its label twice.
  const needsOwnTitle = panelChrome(panel.type) === 'bare' && panel.status !== 'ready';

  return (
    <DashboardPanel
      id={panel.id}
      title={panel.title}
      subtitle={panel.subtitle}
      span={panel.span}
      // `stat`/`stat-group` bodies panel themselves (console-ui skill) — `panelChrome` is the one
      // place that list lives, so the console and Storybook cannot disagree about it.
      chrome={panelChrome(panel.type)}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      actions={panel.view ? renderPanelActions(panel.view, 'panel') : null}>
      {({ size }) => {
        if (panel.status === 'error') {
          return (
            <PanelStateBody title={needsOwnTitle ? panel.title : undefined}>
              {/* No `retryLabel`: `ErrorLine`'s own default now comes from the ui-web copy
                  context, which `ConsoleCopyProvider` fills from this same bundle (ADR 0017), so
                  restating it here would be the word declared twice. */}
              <ErrorLine
                message={panel.errorMessage ?? t('state.panel-failed')}
                onRetry={panel.onRetry}
              />
            </PanelStateBody>
          );
        }
        if (panel.status === 'loading' || !panel.view) {
          return (
            <PanelStateBody title={needsOwnTitle ? panel.title : undefined}>
              <SkeletonMetric />
            </PanelStateBody>
          );
        }
        // The truncation caption is rendered HERE, once, for every panel type — rather than as a
        // field on each of the nine view shapes, which would have made it something a renderer
        // could forget. ADR 0013 D5 makes it non-optional ("explicit limits and truncation
        // captions"), and a chart that is quietly short is worse than no chart.
        return (
          <>
            {renderPanelBody(panel.view, size)}
            {panel.truncationCaption ? (
              <InlineStatus className="mt-2">{panel.truncationCaption}</InlineStatus>
            ) : null}
          </>
        );
      }}
    </DashboardPanel>
  );
}

/** A loading/error body, optionally under the panel's own title — see `needsOwnTitle` above. The
 *  label uses the same `LABEL_CLASS` a `StatCard` gives its own, so a failed stat panel reads at
 *  the same weight as the one beside it that resolved. */
function PanelStateBody({ title, children }: { title?: string; children: React.ReactNode }) {
  if (!title) return <>{children}</>;
  return (
    <div className="flex flex-col gap-2">
      <span className={LABEL_CLASS}>{title}</span>
      {children}
    </div>
  );
}
