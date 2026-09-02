import React from 'react';

import { DonutChart } from '../../components/donut-chart';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { SegmentedControl } from '../../components/segmented-control';
import { ShareBar } from '../../components/share-bar';
import { StatCard } from '../../components/stat-card';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { LatencyStatCards } from '../latency-stat-cards';
import { MultiSeriesSpendBoard, SCALE_OPTIONS } from '../multi-series-spend-board';
import { RankedSeriesRows } from '../ranked-series-rows';
import { OverviewStatRow } from '../overview-stat-row';
import {
  PANEL_CHART_FALLBACK_WIDTH,
  PANEL_CHART_HEIGHT,
  PANEL_TABLE_PAGE_SIZE,
  PANEL_TOP_N,
} from './sizes';
import { DASHBOARD_PANEL_TYPES } from './types';
import type {
  DashboardPanelType,
  DashboardPanelView,
  DashboardTableRow,
  PanelRenderer,
  PanelRendererProps,
} from './types';

/**
 * The renderer registry behind the declarative dashboard engine (converse-frontends#446, decision
 * D-K): one entry per panel `type`, each composing an ALREADY-SHIPPED primitive rather than
 * drawing anything of its own. Adding a panel to a page is adding YAML; adding a panel SHAPE is
 * adding an entry here plus a Storybook story, and nothing else.
 *
 * It lives in `packages/ui-web` rather than in `apps/console` for one concrete reason: Storybook
 * runs here, and the epic's acceptance surface is "one story per panel type, plus a `Pages/
 * FromSpec` story that renders a real YAML page entry — so a page is reviewable BEFORE its
 * backend column exists." A registry the stories could not import would have to be mirrored by a
 * story-local copy, and the copy is exactly what would drift. `apps/console`'s
 * `dashboard-renderer.tsx` imports this map, wires each panel's queried data into it, and is
 * where `panelRenderers[type]` is asserted to cover all nine types against the console's own zod
 * schema.
 *
 * Every renderer is a pure function of `{ view, size }`:
 *  - `view` is render-ready data (pre-formatted money, resolved labels) produced by the console's
 *    per-metric adapters — no query client, no `UsageQueryResponse`, nothing async. That is what
 *    lets C10 render the same panel list server-side for the PDF report.
 *  - `size` is `'panel'` or `'expanded'`, and it changes DENSITY, not just pixels (chart height,
 *    ranked Top-N, table page size — see `sizes.ts`).
 *
 * Doctrine held here, not left to callers (ADR 0013 D5 as amended 2026-09-02):
 *  - no filled disks — `donut` renders `chart-core`'s clamped RING;
 *  - no stacked bars, no area fills anywhere in this file;
 *  - no static per-series legend lists — every chart's values are on hover, through the shared
 *    Floating-UI `ChartTooltip`.
 */

// ── series ───────────────────────────────────────────────────────────────────────────────────

/** Both series-shaped panels draw the same board; only the axis formatting differs. The board's
 *  own heading is suppressed (`heading="none"`) because `DashboardPanel` already renders the
 *  title row — the scale toggle moves into THAT row via `panelActionRenderers` below. */
function SeriesBody({
  view,
  size,
  formatYTick,
  formatValue,
}: {
  view: Extract<DashboardPanelView, { kind: 'series' | 'latency-series' }>;
  size: PanelRendererProps['size'];
  formatYTick?: (value: number) => string;
  formatValue?: (value: number) => string;
}) {
  return (
    <MultiSeriesSpendBoard
      heading="none"
      series={view.series}
      scale={view.scale}
      onScaleChange={view.onScaleChange}
      fallbackWidth={PANEL_CHART_FALLBACK_WIDTH[size]}
      height={PANEL_CHART_HEIGHT[size]}
      formatValue={formatValue}
      formatYTick={formatYTick}
      emptyMessage={view.emptyMessage}
      truncationCaption={view.truncationCaption}
    />
  );
}

/** Latency is milliseconds, not dollars — overriding both the axis and the tooltip formatter,
 *  because `MultiSeriesSpendChart` defaults to money on each independently and a `$412` p95 would
 *  be a fabricated unit, the exact failure `formatYTick` was added for. */
const formatMs = (value: number) => `${Math.round(value)} ms`;

// ── donut ────────────────────────────────────────────────────────────────────────────────────

/** The ring measures its own box, like every other chart here — a square as tall as the panel's
 *  chart height, so the hole and the band stay proportional at both sizes. */
function DonutBody({ view, size }: PanelRendererProps<'donut'>) {
  const { ref, size: measured } = useResizeObserver<HTMLDivElement>();
  const height = PANEL_CHART_HEIGHT[size];
  const width = Math.min(measured.width || PANEL_CHART_FALLBACK_WIDTH[size], height * 2);

  return (
    <div ref={ref} className="dashboard-panel-chart">
      <DonutChart
        segments={view.segments}
        width={width}
        height={height}
        topN={view.topN ?? PANEL_TOP_N[size]}
        centreMetric={view.centreMetric}
        centreLabel={view.centreLabel}
        selectedKey={view.selectedKey}
        onSelectSegment={view.onSelectSegment}
        emptyMessage={view.emptyMessage}
      />
    </div>
  );
}

// ── table ────────────────────────────────────────────────────────────────────────────────────

function TableBody({ view, size }: PanelRendererProps<'table'>) {
  const pageSize = PANEL_TABLE_PAGE_SIZE[size];
  // The page INDEX is the caller's (the console holds it in the URL); the page SIZE is this
  // panel's, and it doubles when the panel is expanded. Clamped so a `?…-page=9` deep-link into a
  // table that has since shrunk lands on a real page rather than on an empty one.
  const lastPage = Math.max(Math.ceil(view.rows.length / pageSize) - 1, 0);
  const page = Math.min(Math.max(view.page ?? 0, 0), lastPage);
  const start = page * pageSize;
  const rows = view.rows.slice(start, start + pageSize);
  const columns: LedgerColumn<DashboardTableRow>[] = view.columns.map((column) => ({
    key: column.key,
    header: column.header,
    align: column.align,
    width: column.width,
    sortable: column.sortable,
    kind: column.kind,
    accessor: (row) => row.cells[column.key],
  }));

  return (
    <>
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.key}
        rowHref={(row) => row.href}
        sort={view.sort}
        onSortChange={view.onSortChange}
      />
      <Pagination
        shown={rows.length}
        total={view.total}
        unit={view.unit}
        // A page that was cut by THIS panel's own size (rather than by the caller's cursor) still
        // has a next page — stated honestly rather than presenting a truncated view as complete.
        hasPrev={view.hasPrev ?? page > 0}
        hasNext={view.hasNext ?? start + pageSize < view.rows.length}
        onPrev={view.onPrev}
        onNext={view.onNext}
      />
    </>
  );
}

// ── the registry ─────────────────────────────────────────────────────────────────────────────

/**
 * `type` → body renderer. Exhaustive over `DASHBOARD_PANEL_TYPES` by construction: the
 * `satisfies` below fails to compile the moment a type is added to that vocabulary without a
 * renderer here, which is the compile-time half of the AC's "unknown panel type is never a silent
 * skip" (the runtime half is the console's zod enum, built from the same array).
 */
export const panelRenderers = {
  stat: ({ view }: PanelRendererProps<'stat'>) => (
    <StatCard label={view.label} metric={view.metric} delta={view.delta} />
  ),

  // A row of ZERO cards renders nothing at all — a hole where a panel was, which reads as broken
  // rather than as "no usage in this range". An inline status line is the honest empty state here
  // (ADR 0013 D5: "empty states are inline status lines, not centred placards", and never a
  // collapsed zone).
  'stat-group': ({ view }: PanelRendererProps<'stat-group'>) =>
    view.stats.length === 0 ? (
      <InlineStatus>{view.emptyMessage ?? 'No usage in this range.'}</InlineStatus>
    ) : (
      <OverviewStatRow
        cards={view.stats.map((stat) => ({
          key: stat.key,
          label: stat.label,
          metric: stat.metric,
          delta: stat.delta,
        }))}
      />
    ),

  series: ({ view, size }: PanelRendererProps<'series'>) => (
    <SeriesBody
      view={view}
      size={size}
      formatValue={view.formatValue}
      formatYTick={view.formatYTick}
    />
  ),

  ranked: ({ view, size }: PanelRendererProps<'ranked'>) => (
    <RankedSeriesRows
      rows={view.rows}
      topN={view.topN ?? PANEL_TOP_N[size]}
      otherLabel={view.otherLabel}
      selectedKey={view.selectedKey}
      onSelect={view.onSelect}
      hrefFor={view.hrefFor}
      emptyMessage={view.emptyMessage}
    />
  ),

  share: ({ view }: PanelRendererProps<'share'>) => (
    <ShareBar
      segments={view.segments}
      selectedKey={view.selectedKey}
      onSelectSegment={view.onSelectSegment}
      emptyMessage={view.emptyMessage}
    />
  ),

  donut: (props: PanelRendererProps<'donut'>) => <DonutBody {...props} />,

  table: (props: PanelRendererProps<'table'>) => <TableBody {...props} />,

  'latency-cards': ({ view }: PanelRendererProps<'latency-cards'>) => (
    <LatencyStatCards rows={view.rows} emptyMessage={view.emptyMessage} />
  ),

  'latency-series': ({ view, size }: PanelRendererProps<'latency-series'>) => (
    <SeriesBody view={view} size={size} formatValue={formatMs} formatYTick={formatMs} />
  ),
} satisfies { [T in DashboardPanelType]: PanelRenderer<T> };

/**
 * `type` → the controls that belong in `DashboardPanel`'s heading actions slot, or `null`.
 *
 * Only the two series shapes have any: the Linear/Log/Indexed scale toggle, which the AC places
 * "in the panel actions slot" rather than in the board's own heading. It reuses
 * `MultiSeriesSpendBoard`'s exported `SCALE_OPTIONS` so the vocabulary is stated once.
 */
export const panelActionRenderers = {
  stat: () => null,
  'stat-group': () => null,
  series: ({ view }: PanelRendererProps<'series'>) => (
    <SegmentedControl
      aria-label="Scale"
      options={SCALE_OPTIONS}
      value={view.scale}
      onChange={view.onScaleChange}
    />
  ),
  ranked: () => null,
  share: () => null,
  donut: () => null,
  table: () => null,
  'latency-cards': () => null,
  'latency-series': ({ view }: PanelRendererProps<'latency-series'>) => (
    <SegmentedControl
      aria-label="Scale"
      options={SCALE_OPTIONS}
      value={view.scale}
      onChange={view.onScaleChange}
    />
  ),
} satisfies { [T in DashboardPanelType]: PanelRenderer<T> };

/**
 * Renders one panel body by looking its `kind` up in the registry — the single call site both
 * `apps/console`'s renderer and every Storybook story go through, so "how a panel type draws" has
 * exactly one answer.
 */
export function renderPanelBody(
  view: DashboardPanelView,
  size: PanelRendererProps['size']
): React.ReactNode {
  const renderer = panelRenderers[view.kind] as PanelRenderer;
  return renderer({ view, size } as PanelRendererProps);
}

/** The actions counterpart of `renderPanelBody`. */
export function renderPanelActions(
  view: DashboardPanelView,
  size: PanelRendererProps['size']
): React.ReactNode {
  const renderer = panelActionRenderers[view.kind] as PanelRenderer;
  return renderer({ view, size } as PanelRendererProps);
}

/** Re-exported so a consumer can assert coverage without importing two modules. */
export { DASHBOARD_PANEL_TYPES };
