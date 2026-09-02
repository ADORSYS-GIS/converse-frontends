import type { ReactNode } from 'react';

import type { LedgerSort, LedgerSortDirection } from '../../components/ledger-table';
import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '../../components/multi-series-spend-chart';
import type { ShareBarSegment } from '../../components/share-bar';
import type { StatCardDelta } from '../../components/stat-card';
import type { DonutSegment } from '../../components/donut-chart';
import type { LatencyStatRow } from '../latency-stat-cards';
import type { RankedSeriesRow } from '../ranked-series-rows';
import type { DashboardPanelSize } from '../dashboard-panel';

/**
 * The nine panel types `dashboards.yaml` may name (converse-frontends#446, decision D-K). This
 * array is the ONE vocabulary: `apps/console`'s zod schema builds its enum from it, the renderer
 * registry below is keyed on it, and both are asserted to cover it exactly — so an unknown `type`
 * in YAML is a validation error rather than a blank card, and a type that exists in the schema
 * with no renderer cannot be shipped.
 *
 * Adding a panel shape means adding an entry HERE plus a renderer plus a Storybook story — never
 * an inline escape hatch in a page (the epic's own assumption).
 */
export const DASHBOARD_PANEL_TYPES = [
  'stat',
  'stat-group',
  'series',
  'ranked',
  'share',
  'donut',
  'table',
  'latency-cards',
  'latency-series',
] as const;

export type DashboardPanelType = (typeof DASHBOARD_PANEL_TYPES)[number];

/** One cell-addressable row of a `table` panel. `cells` is keyed by column key; `href` turns the
 *  first column into a real anchor through `LedgerTable`'s own `rowHref`. */
export interface DashboardTableRow {
  key: string;
  cells: Record<string, ReactNode>;
  href?: string;
}

export interface DashboardTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'right';
  width?: string;
  sortable?: boolean;
  kind?: 'text' | 'data';
}

/**
 * A panel's RENDER-READY data — what the console's per-metric adapters produce from a usage
 * response, and the only thing a renderer ever sees.
 *
 * The split matters for two reasons the epic depends on. First, C10 (the export pipeline) walks
 * the same resolved panel list server-side: a view that is plain data plus pre-formatted strings
 * renders to SVG with no query layer at all. Second, it is what lets Storybook render every panel
 * type — and a whole YAML page — from fixtures, before the backend column behind a panel exists.
 *
 * Money and counts arrive PRE-FORMATTED (`metric`, `formattedValue`), the same contract
 * `StatCard`/`RankedSeriesRows`/`ShareBar` already hold: units and locale are the caller's, never
 * a primitive's guess.
 */
export type DashboardPanelView =
  | { kind: 'stat'; label: string; metric: string; delta?: StatCardDelta; sparkline?: number[] }
  | {
      kind: 'stat-group';
      stats: { key: string; label: string; metric: string; delta?: StatCardDelta }[];
      /** Shown INSTEAD of the (empty) card row when the window produced no groups. A row of zero
       *  cards renders nothing at all, which reads as a broken panel rather than as "no usage" —
       *  the collapsed zone ADR 0013 D5 bans. */
      emptyMessage?: string;
    }
  | {
      kind: 'series';
      series: MultiSeriesSpendSeries[];
      scale: MultiSeriesSpendScale;
      onScaleChange: (scale: MultiSeriesSpendScale) => void;
      /** Pre-formats a y value in the tooltip; omit for the money default. */
      formatValue?: (value: number) => string;
      /** Pre-formats a y-axis tick; a COUNT board must override this or the axis fabricates `$`. */
      formatYTick?: (value: number) => string;
      emptyMessage?: string;
      truncationCaption?: string;
    }
  | {
      kind: 'ranked';
      rows: RankedSeriesRow[];
      topN?: number;
      otherLabel?: (count: number) => string;
      selectedKey?: string | null;
      onSelect?: (key: string | null) => void;
      hrefFor?: (row: RankedSeriesRow) => string | undefined;
      emptyMessage?: string;
    }
  | {
      kind: 'share';
      segments: ShareBarSegment[];
      selectedKey?: string | null;
      onSelectSegment?: (key: string | null) => void;
      emptyMessage?: string;
    }
  | {
      kind: 'donut';
      segments: DonutSegment[];
      topN?: number;
      centreMetric?: string;
      centreLabel?: string;
      selectedKey?: string | null;
      onSelectSegment?: (key: string | null) => void;
      emptyMessage?: string;
    }
  | {
      kind: 'table';
      columns: DashboardTableColumn[];
      rows: DashboardTableRow[];
      /** Plural noun for the `Pagination` caption — "actors", "channels". */
      unit: string;
      sort?: LedgerSort;
      onSortChange?: (sort: LedgerSort) => void;
      /**
       * Which page of `rows` to draw, 0-based. The caller holds it (in the URL, for the console)
       * but does NOT slice: the page SIZE is this panel's own density decision
       * (`PANEL_TABLE_PAGE_SIZE`, and it doubles in the expanded dialog), so a caller that sliced
       * would have to know a number it has no business knowing — and would silently show ten rows
       * in a dialog sized for fifty.
       */
      page?: number;
      hasPrev?: boolean;
      hasNext?: boolean;
      onPrev?: () => void;
      onNext?: () => void;
      total?: number;
    }
  | { kind: 'latency-cards'; rows: LatencyStatRow[]; emptyMessage?: string }
  | {
      kind: 'latency-series';
      series: MultiSeriesSpendSeries[];
      scale: MultiSeriesSpendScale;
      onScaleChange: (scale: MultiSeriesSpendScale) => void;
      emptyMessage?: string;
      truncationCaption?: string;
    };

/**
 * The two panel types whose BODY already panels itself — `StatCard` and `OverviewStatRow` (a row
 * of them) carry "their own `surface` fill, never wrapped in an outer `Card`" by the console-ui
 * skill's own long-standing exemption. A `DashboardPanel` renders these with `chrome: 'bare'`;
 * everything else gets the `Card` + `ZoneHeading` zone container.
 *
 * Declared here, beside the type vocabulary, so `apps/console`'s renderer and every Storybook
 * story read the same list rather than each deciding per type at the call site.
 */
export const SELF_PANELLING_TYPES: readonly DashboardPanelType[] = ['stat', 'stat-group'];

/** `'bare'` for a self-panelling body, `'card'` for every other type. */
export function panelChrome(type: DashboardPanelType): 'card' | 'bare' {
  return SELF_PANELLING_TYPES.includes(type) ? 'bare' : 'card';
}

/** `DashboardPanelView` narrowed to one type — `PanelViewOf<'donut'>` is the donut arm. */
export type PanelViewOf<T extends DashboardPanelType> = Extract<DashboardPanelView, { kind: T }>;

export interface PanelRendererProps<T extends DashboardPanelType = DashboardPanelType> {
  view: PanelViewOf<T>;
  size: DashboardPanelSize;
}

export type PanelRenderer<T extends DashboardPanelType = DashboardPanelType> = (
  props: PanelRendererProps<T>
) => ReactNode;

export type { LedgerSortDirection };
