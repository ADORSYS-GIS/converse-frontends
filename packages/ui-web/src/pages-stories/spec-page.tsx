import React, { useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';

// The REAL checked-in document, read as text — "the fixture path IS the YAML"
// (converse-frontends#446). Not a copy: a copy is what would drift, and a story rendering a copy
// would certify a page nobody ships. This is a DATA import; nothing here imports `apps/console`
// code, so the package dependency direction is unchanged (see `src/vite-raw-imports.d.ts`).
import dashboardsYaml from '../../../../apps/console/dashboards.yaml?raw';
// ADR 0017: `dashboards.yaml` carries i18n KEYS for `title`/`subtitle`/`rowLabel`/`unit`, and the
// console's engine resolves them per request. A story has no request, so it resolves against the
// SOURCE-OF-TRUTH bundle, English — the same file `locales/en/dashboards.json` the console reads.
// Reading the real bundle rather than restating the copy keeps the "the fixture path IS the YAML"
// property intact for the copy as well as for the structure: a renamed key surfaces here as a
// visible key on the card, not as a story quietly certifying stale wording.
import dashboardsEn from '../../../../apps/console/locales/en/dashboards.json';

import { ErrorLine } from '../components/error-line';
import { InlineStatus } from '../components/inline-status';
import type { MultiSeriesSpendScale } from '../components/multi-series-spend-chart';
import {
  applyLinkTemplate,
  collapseSegmentsTail,
  resolveDashboardPanelDimension,
  resolveDashboardScale,
  resolveDashboardSeriesStyle,
} from '../lib/dashboard-view-mapping';
import { formatUsd } from '../lib/money';
import { IdentityLines } from '../lib/identity-lines';
import { LABEL_CLASS } from '../lib/type-roles';
import { DashboardGrid } from '../sections/dashboard-grid';
import { DashboardPanel } from '../sections/dashboard-panel';
import { emptyPanelFixtures, panelFixtures } from '../sections/dashboard-panels/fixtures';
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
  /** `table` only — the closed column vocabulary the YAML declared (`options.columns`). Read here
   *  because `/admin/usage`'s actor ledger has six columns and its channel ledger three, and a
   *  story drawing the default four would be reviewing neither. */
  columns?: string[];
  /** `options.lens` — set on a lens-driven panel. Drives the actor table's `Type` cell. */
  lens?: string;
  /** The panel's first `group_by` dimension. A ranked list of BILLING PLANS labelled with model
   *  names teaches a reviewer nothing, so the breakdown fixtures follow it. */
  dimension?: string;
  /** `options.scale` — the panel's own DEFAULT axis transform, which the console takes from the
   *  YAML (`use-dashboard.ts`) rather than from a page-level value. A story that drew every board
   *  linear would be reviewing a page nobody ships: `cost-by-model` defaults to log precisely
   *  because one model at ~95% share flattens every other line on a linear axis. */
  scale?: MultiSeriesSpendScale;
  /** `options.style` — `series` only, which MARK the panel draws (`lines`, the default, or
   *  `stacked-bars`). Read here rather than left to the per-type fixture because a fixture drawn
   *  as a superposed line board would review a chart nobody ships: three of `dashboards.yaml`'s
   *  spend-by-model panels are stacks (the owner's 2026-09-03 ruling), and this is the field whose
   *  absence let every one of them render as a plain line board in Storybook while the console
   *  itself drew a stack (converse-frontends#487, #492). */
  style?: 'lines' | 'stacked-bars';
  /** `options.topN` — rows/segments/wedges before the tail collapses, for `ranked`, `share` and
   *  `donut`. Read here because a `donut` panel's own ring collapses at a DIFFERENT count than the
   *  panel size's default (`/admin/usage`'s three model rings collapse at 6, not the engine's own
   *  panel-size default), and a story drawing the wrong cap reviews a ring nobody ships. */
  topN?: number;
  /** `options.link` — a route TEMPLATE with `:key` standing for a row's own group-by value
   *  (`ranked`) or, with `$lens` already substituted by this panel's own `lens`, a table row's
   *  href. Read here rather than hardcoded per table shape, which is exactly how the two
   *  top-spender ledgers on `/admin/overview` (`?type=account` and `?type=project`) used to both
   *  link to `?type=user` — the same fixture's own baked-in href, unread against the YAML. */
  link?: string;
  /** The panel's own `metric` (`cost` | `requests` | `tokens` | `latency` | `derived:<name>`).
   *  A `stat` panel's FIGURE has to follow it, or a page of stats all reads "$943.60" and a
   *  reviewer cannot tell a count panel from a money one — which is half of what a page story is
   *  supposed to surface. */
  metric?: string;
  /** `compare: true` — the panel carries a previous-window overlay. */
  compare?: boolean;
}

/**
 * The four states every page story must show (an explicit AC of story C5). They are rendered by
 * `SpecPanels` rather than by each story, so the console's own treatment and the story's cannot
 * diverge: `truncated` is an `InlineStatus` under the body (exactly what
 * `dashboard-renderer.tsx` draws from `DashboardPanelState.truncationCaption`), `error` is an
 * `ErrorLine` inside the panel's own card with its title and Expand button intact, and `empty` is
 * each type's own inline empty status — never a centred placard, never a collapsed zone.
 */
export type SpecPageState = 'loaded' | 'empty' | 'truncated' | 'error';

const TRUNCATION_CAPTION =
  'Showing the most recent 2,000 time buckets — older buckets in this window were dropped to fit ' +
  'the query limit, so totals here are lower than the true period totals. Narrow the range for a ' +
  'complete reading.';

export interface SpecPage {
  route: string;
  panels: SpecPanel[];
}

/** A panel's first `group_by` dimension, or `undefined` for an ungrouped query.
 *
 * `options.dimension` (C12, converse-frontends#455) names a dimension other than the query's
 * first, and `'none'` names no dimension at all — the ungrouped total off a grouped query. A
 * story that followed `group_by[0]` regardless would label a family TOTAL chart with account
 * names. Delegates to `dashboard-view-mapping.ts`'s shared resolver — the SAME rule
 * `panel-adapters.tsx`'s `panelDimension` reads off the validated spec — rather than restating it
 * against the raw YAML, which is exactly the duplication that let `options.style` drift
 * unnoticed (converse-frontends#487, #492: see this module's own top-of-file note). */
function readDimension(query: unknown, options: Record<string, unknown>): string | undefined {
  const groupBy = (query as { group_by?: unknown } | undefined)?.group_by;
  return resolveDashboardPanelDimension(
    options.dimension,
    Array.isArray(groupBy) ? groupBy.map(String) : undefined
  );
}

/**
 * `admin-overview.estate-spend.title` -> the English string, or the key itself when the bundle has
 * no entry for it.
 *
 * Returning the KEY on a miss is deliberate and matches i18next's own behaviour in the console: an
 * untranslated panel shows a dotted path on the card, which a reviewer cannot miss. A silent
 * fallback to the id, or to an empty string, would let a missing key ship.
 */
function englishCopy(key: string): string {
  const parts = key.split('.');
  let node: unknown = dashboardsEn;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
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
          title: englishCopy(String(p.title)),
          subtitle: p.subtitle === undefined ? undefined : englishCopy(String(p.subtitle)),
          span: p.span === 2 ? 2 : 1,
          rowLabel:
            options.rowLabel === undefined ? undefined : englishCopy(String(options.rowLabel)),
          unit: options.unit === undefined ? undefined : englishCopy(String(options.unit)),
          columns: Array.isArray(options.columns) ? options.columns.map(String) : undefined,
          lens: options.lens === undefined ? undefined : String(options.lens),
          metric: p.metric === undefined ? undefined : String(p.metric),
          dimension: readDimension(p.query, options),
          scale: resolveDashboardScale(options.scale),
          style: resolveDashboardSeriesStyle(options.style),
          topN: typeof options.topN === 'number' ? options.topN : undefined,
          link: options.link === undefined ? undefined : String(options.link),
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

/**
 * One `table` panel's fixture, honouring the columns the YAML declared.
 *
 * `/admin/usage`'s actor ledger is six columns (identity over email, what a row IS, three figures
 * and a bucket-grained "last active") and its channel ledger is three. Drawing the default four for
 * both would review neither, and a column header is a CLAIM about what the rows are — which is
 * exactly the kind of quiet mislabelling this story exists to catch.
 */
const TABLE_HEADERS: Record<string, { header: string; align?: 'right'; kind?: 'data' }> = {
  label: { header: 'Actor' },
  type: { header: 'Type' },
  cost: { header: 'Cost', align: 'right', kind: 'data' },
  requests: { header: 'Requests', align: 'right', kind: 'data' },
  tokens: { header: 'Tokens', align: 'right', kind: 'data' },
  lastActive: { header: 'Last active', align: 'right', kind: 'data' },
};

/** Realistic rows: a resolved identity, one that resolved to an email only, a service principal
 *  with no email at all, and one raw id nothing resolved — the sentinel case, KEPT rather than
 *  dropped, which is an explicit AC. */
const TABLE_ROWS: {
  key: string;
  label: string;
  detail?: string;
  subtle?: boolean;
  cost: number;
  requests: number;
  tokens: number;
  lastActive: string;
}[] = [
  {
    key: 'usr_ada',
    label: 'Ada Lovelace',
    detail: 'ada@adorsys.com',
    cost: 612.05,
    requests: 18_402,
    tokens: 41_208_113,
    lastActive: '2026-08-29 14:00 UTC',
  },
  {
    key: 'usr_grace',
    label: 'grace@adorsys.com',
    cost: 208.4,
    requests: 6_115,
    tokens: 13_998_002,
    lastActive: '2026-08-29 11:00 UTC',
  },
  {
    key: 'usr_ci',
    label: 'ci-deploy',
    detail: 'ci-deploy@adorsys.com',
    cost: 96.15,
    requests: 41_220,
    tokens: 2_004_881,
    lastActive: '2026-08-29 15:00 UTC',
  },
  {
    key: 'usr_01j8k2m4p',
    label: 'usr_01j8k2m4p',
    cost: 21.8,
    requests: 902,
    tokens: 811_400,
    lastActive: '2026-08-27 09:00 UTC',
  },
  {
    key: 'missing:github:preferred_username',
    label: 'Unidentified — GitHub',
    subtle: true,
    cost: 5.2,
    requests: 118,
    tokens: 240_090,
    lastActive: '2026-08-22 03:00 UTC',
  },
];

/**
 * Re-states a ranked fixture's `formattedValue` in the panel's OWN unit.
 *
 * The fixtures are per-TYPE and their values are dollars, which is right for a cost ranking and a
 * quiet lie on a count one. Counts are derived from the same measured magnitudes (scaled up, since
 * a request count of `812.40` is not a count either) so the top-1-dominant distribution the
 * fixtures were built around survives.
 */
function rankedUnit<T extends { value: number; formattedValue?: string }>(
  rows: T[],
  metric: string | undefined
): T[] {
  if (metric !== 'requests' && metric !== 'tokens') return rows;
  const factor = metric === 'tokens' ? 60_000 : 50;
  return rows.map((row) => {
    const value = Math.round(row.value * factor);
    return { ...row, value, formattedValue: value.toLocaleString('en-US') };
  });
}

const LENS_NOUN: Record<string, string> = {
  user: 'User',
  account: 'Account',
  project: 'Project',
};

/**
 * The keys a breakdown fixture uses, per group-by dimension.
 *
 * `panelFixtures` is per-TYPE, which is right for reviewing a panel SHAPE and wrong for reviewing a
 * PAGE: `/admin/usage` ranks billing plans on one panel and OAuth clients on the next, and drawing
 * model names under both would hide exactly the mislabelling this story exists to catch. Every set
 * keeps the top-1-dominant distribution the fixtures were measured against, so the charts stay a
 * real review surface.
 */
const DIMENSION_KEYS: Record<string, string[]> = {
  billing_plan: ['pro', 'free', 'scale', 'trial'],
  // Already HUMANISED — `panel-adapters.tsx` maps the wire vocabulary (`chat_completions`, …)
  // through `OPERATION_LABELS` before a row ever reaches a renderer, so a story showing the
  // snake_case values would be reviewing a page nobody ships. "Other" is kept because it is the
  // row an operator has to see before believing a chat total.
  operation: ['Chat completions', 'Responses', 'Messages', 'Embeddings', 'Other'],
  azp: ['console-ui', 'opencode-cli', 'ci-deploy', 'zed-editor', 'raycast'],
  user_id: ['Ada Lovelace', 'grace@adorsys.com', 'ci-deploy', 'usr_01j8k2m4p'],
  account_id: ['Brightline', 'Stark Infer', 'Northwind Labs', 'acct_01j7x'],
  project_id: ['ingest', 'rag-api', 'batch-eval', 'Unassigned'],
};

/**
 * Per-page narrowing of `DIMENSION_KEYS` — a page story passes the key set ITS subject would
 * realistically show for a dimension the estate pages also use.
 *
 * `azp` is the case it exists for: `/admin/usage` looks at every OAuth client on the deployment,
 * while one account's overview typically sees a handful. Reviewing the account page's three
 * channel rings against the estate's five-client fixture would be reviewing a distribution that
 * account will never have, and the whole reason the fixtures are top-1-dominant rather than evenly
 * banded is that a ring only earns its place if the story shows the shape prod actually produces.
 */
export type DimensionKeyOverrides = Record<string, string[]>;

/** One panel → the key set its breakdown fixture is re-keyed onto (`undefined` = leave the
 *  per-type fixture's own keys alone, which is right for `model` and for an ungrouped panel). */
export type DimensionKeyLookup = (panel: SpecPanel) => string[] | undefined;

export function dimensionKeyLookup(
  overrides: DimensionKeyOverrides | undefined
): DimensionKeyLookup {
  return (panel) => {
    const dimension = panel.dimension ?? '';
    return overrides?.[dimension] ?? DIMENSION_KEYS[dimension];
  };
}

/** Re-keys a ranked/share/donut fixture onto the panel's own dimension, keeping each entry's
 *  measured VALUE (and dropping the tail when the dimension has fewer members than the fixture). */
function reKey<T extends { key: string; label: string }>(entries: T[], keys: string[] | undefined) {
  if (!keys) return entries;
  return entries
    .slice(0, keys.length)
    .map((entry, index) => ({ ...entry, key: keys[index], label: keys[index] }));
}

/**
 * A `stat` panel's figure, per metric — money for cost, a grouped count for requests and tokens, a
 * ratio for cost-per-MTok, a plain integer for the two distinct/filtered counts.
 *
 * Without this, every stat on a nineteen-panel page reads `$943.60`, and a reviewer cannot tell a
 * count panel from a money one — which is precisely the reading a page story is for. The DELTA
 * follows `compare: true` for the same reason: only two panels on `/admin/usage` compare, and a
 * delta drawn under all six would misrepresent what the page claims to know.
 */
const STAT_METRIC_FIXTURE: Record<string, string> = {
  cost: '$943.60',
  requests: '72,757',
  tokens: '58,262,486',
  latency: '412 ms',
  'derived:avgCostPerMillionTokens': '$16.20 / 1M',
  'derived:costPerRequest': '$0.0130',
  'derived:activeActors': '187',
  'derived:chatCount': '64,112',
};

/** The same figures for an EMPTY window — `formatMetric(0, …)`, and a dash where there is no
 *  denominator. Exactly what `statView` renders; a story that showed `$0.00` for a count panel
 *  would be reviewing a fabricated unit. */
const EMPTY_STAT_FIXTURE: Record<string, string> = {
  cost: '$0.00',
  requests: '0',
  tokens: '0',
  latency: '0 ms',
  'derived:avgCostPerMillionTokens': '—',
  // A mean over zero requests has no value — the same dash `costPerRequest` returns `null` for.
  'derived:costPerRequest': '—',
  'derived:activeActors': '0',
  'derived:chatCount': '0',
};

/**
 * A table row's href, off the panel's OWN `options.link` — never a hardcoded per-shape template.
 *
 * The two top-spender ledgers on `/admin/overview` are the reason this exists rather than the
 * fixture's own baked-in href: both fall through to the four-column branch below, and that
 * fixture's rows are all stamped `?type=user` — right for neither, since one panel's real
 * `options.link` says `?type=account` and the other `?type=project`. A hardcoded template that
 * happened to match every table's link the day it was written is exactly the kind of duplicated
 * list the YAML itself already fixes elsewhere; a table's href is no more special than that.
 *
 * `$lens` is substituted the same way `resolve-dashboard.ts` substitutes it server-side — with
 * the panel's OWN `options.lens`, since a page story has no separate lens knob of its own to read
 * a resolved value from.
 */
function tableRowHref(panel: SpecPanel, key: string): string | undefined {
  const link = panel.lens ? panel.link?.split('$lens').join(panel.lens) : panel.link;
  return applyLinkTemplate(link, key);
}

function tableFixture(panel: SpecPanel, keysFor: DimensionKeyLookup): DashboardPanelView {
  const base = panelFixtures.table;
  if (base.kind !== 'table' || !panel.columns) {
    // No `columns` in the YAML — the pre-#448 four-column shape, unchanged.
    if (base.kind !== 'table') return base;
    return {
      ...base,
      columns: base.columns.map((column, index) =>
        index === 0 && panel.rowLabel ? { ...column, header: panel.rowLabel } : column
      ),
      unit: panel.unit ?? base.unit,
      rows: panel.link
        ? base.rows.map((row) => ({ ...row, href: tableRowHref(panel, row.key) }))
        : base.rows,
    };
  }

  const rowType = panel.lens ? LENS_NOUN[panel.lens] : (panel.rowLabel ?? '—');
  // A CHANNEL table's rows are OAuth clients, not people — the actor identities below would be a
  // straight mislabelling, which is the one thing this story is here to catch. Every non-actor
  // dimension takes its own key set and drops the identity's second line with it.
  const channelKeys = panel.lens ? undefined : keysFor(panel);
  const rows = channelKeys
    ? TABLE_ROWS.slice(0, channelKeys.length).map((row, index) => ({
        ...row,
        key: channelKeys[index],
        label: channelKeys[index],
        detail: undefined,
        subtle: false,
      }))
    : TABLE_ROWS;

  return {
    kind: 'table',
    columns: panel.columns.map((key) => ({
      key,
      sortable: true,
      ...(TABLE_HEADERS[key] ?? { header: key }),
      ...(key === 'label' && panel.rowLabel ? { header: panel.rowLabel } : {}),
    })),
    rows: rows.map((row) => ({
      key: row.key,
      href: tableRowHref(panel, row.key),
      cells: {
        label: <IdentityLines label={row.label} detail={row.detail} subtle={row.subtle} />,
        type: rowType,
        cost: formatUsd(row.cost),
        requests: row.requests.toLocaleString('en-US'),
        tokens: row.tokens.toLocaleString('en-US'),
        lastActive: row.lastActive,
      },
    })),
    unit: panel.unit ?? 'actors',
    total: rows.length,
    page: 0,
  };
}

export interface SpecPanelScaleControls {
  scale: MultiSeriesSpendScale;
  onScaleChange: (scale: MultiSeriesSpendScale) => void;
}

/**
 * One panel's fixture-built view for the EMPTY state — pulled out of `SpecPanels`'s render loop so
 * it is callable on its own, without mounting a component. See that function's own doc comment for
 * why the split exists at all.
 */
export function buildEmptySpecPanelView(
  panel: SpecPanel,
  scaleControls: SpecPanelScaleControls
): DashboardPanelView {
  const empty = emptyPanelFixtures[panel.type];
  if (empty.kind === 'series' || empty.kind === 'latency-series') {
    return { ...empty, scale: scaleControls.scale, onScaleChange: scaleControls.onScaleChange };
  }
  if (empty.kind === 'stat') {
    // An empty window still has an honest figure, and it is UNIT-CORRECT: `$0.00` for money, `0`
    // for a count, and a DASH for a ratio with no denominator (`avgCostPerMillionTokens` —
    // `$0.00 / 1M` would read as "we measured it and it is free"). This is what the console's own
    // `statView` produces; the story must not be gentler than the page.
    return {
      ...empty,
      label: panel.title,
      metric: (panel.metric && EMPTY_STAT_FIXTURE[panel.metric]) || empty.metric,
    };
  }
  return empty;
}

/**
 * One panel's fixture-built view for the LOADED state — the pure half of `SpecPanels`'s render
 * loop, pulled out for two reasons. First, a React `useMemo` body cannot be unit-tested on its
 * own; second, and the reason it matters here, `apps/console/src/dashboards/spec-page-story-
 * parity.test.tsx` calls this function directly, beside the real `toPanelView`, to assert the two
 * cannot silently draw a different chart for the same YAML panel again — which is exactly how
 * `options.style` drifted the first time (converse-frontends#487, #492): nothing FAILED, a story
 * just quietly stopped matching the page it exists to certify.
 */
export function buildSpecPanelView(
  panel: SpecPanel,
  keysFor: DimensionKeyLookup,
  scaleControls: SpecPanelScaleControls
): DashboardPanelView {
  const fixture = panel.type === 'table' ? tableFixture(panel, keysFor) : panelFixtures[panel.type];
  const { scale, onScaleChange } = scaleControls;

  if (fixture.kind === 'table') return fixture;

  if (fixture.kind === 'series') {
    // A `compare: true` panel's last line is the previous window, DASHED — the console's own
    // adapter appends exactly that (`comparisonSeries`), and it is the whole reading of the panel,
    // so a story that drew four ordinary lines would be reviewing the wrong chart. A STACK never
    // carries the overlay at all — `panel-adapters.tsx`'s own `seriesView` refuses it (a previous
    // period is not a part of this period's total), so neither does this.
    const keyed = reKey(fixture.series, keysFor(panel));
    const stacked = panel.style === 'stacked-bars';
    const series =
      panel.compare && !stacked && keyed.length > 1
        ? keyed.map((s, index) =>
            index === keyed.length - 1 ? { ...s, label: 'Previous period', dashed: true } : s
          )
        : keyed;
    return {
      ...fixture,
      series,
      scale,
      onScaleChange,
      // The field whose absence let every `stacked-bars` panel in `dashboards.yaml` render as a
      // plain line board in Storybook (converse-frontends#487, #492) — see `SpecPanel.style`.
      style: panel.style,
      topN: panel.topN,
    };
  }

  if (fixture.kind === 'latency-series') {
    return { ...fixture, series: reKey(fixture.series, keysFor(panel)), scale, onScaleChange };
  }

  if (fixture.kind === 'stat') {
    // The panel's TITLE is the stat's label in the console (`statView`), because a bare stat panel
    // has no heading row of its own — so the fixture's own label must not stand in for it, or
    // every stat on the page reads "Total cost".
    return {
      ...fixture,
      label: panel.title,
      metric: (panel.metric && STAT_METRIC_FIXTURE[panel.metric]) || fixture.metric,
      delta: panel.compare ? fixture.delta : undefined,
    };
  }

  if (fixture.kind === 'ranked') {
    return {
      ...fixture,
      // The per-type fixture's values are DOLLARS. A ranking of requests or tokens formatted as
      // money is a fabricated unit — the same failure `formatYTick` exists to prevent on an axis,
      // and the exact thing a reviewer looking at `/admin/usage/channels/<azp>`'s "Requests by
      // operation" would (rightly) flag. The console's own adapter formats by `metric`; so does
      // this.
      rows: rankedUnit(reKey(fixture.rows, keysFor(panel)), panel.metric),
      topN: panel.topN,
      hrefFor: panel.link ? (row) => applyLinkTemplate(panel.link, row.key) : undefined,
    };
  }

  if (fixture.kind === 'share') {
    return {
      ...fixture,
      // `ShareBar` has no Top-N notion of its own — the console's own adapter folds the tail into
      // ONE summed `Other (N)` segment before the primitive ever sees it; so does this
      // (`/accounts/<id>/overview` and `/settings/overview/usage` both cap their model-share ring
      // at 5).
      segments: collapseSegmentsTail(
        reKey(fixture.segments, keysFor(panel)),
        panel.topN,
        formatUsd
      ),
    };
  }

  if (fixture.kind === 'donut') {
    return {
      ...fixture,
      segments: reKey(fixture.segments, keysFor(panel)),
      topN: panel.topN,
      // The ring's centre states the TOTAL of what the ring measures — a requests ring centred on
      // a dollar figure would be a fabricated unit, the same failure `formatYTick` exists to
      // prevent on a chart axis.
      centreMetric: (panel.metric && STAT_METRIC_FIXTURE[panel.metric]) || fixture.centreMetric,
    };
  }

  return fixture;
}

/** The panels of one YAML page, in `DashboardGrid`, drawn by the real renderer registry. */
export function SpecPanels({
  page,
  state = 'loaded',
  dimensionKeys,
}: {
  page: SpecPage;
  state?: SpecPageState;
  /** Per-page narrowing of the shared breakdown key sets — see `DimensionKeyOverrides`. */
  dimensionKeys?: DimensionKeyOverrides;
}) {
  const keysFor = useMemo(() => dimensionKeyLookup(dimensionKeys), [dimensionKeys]);
  // PER PANEL, not per page — the console holds one `?<panel-id>-scale=` knob each, and the
  // default is the panel's own YAML `options.scale`. A single shared value would either lose those
  // defaults or force every board onto one transform, which is exactly the drift externalizing the
  // dashboards exists to end.
  const [scales, setScales] = useState<Record<string, MultiSeriesSpendScale>>({});
  const scaleOf = (panel: SpecPanel): MultiSeriesSpendScale =>
    scales[panel.id] ?? panel.scale ?? 'linear';
  const setScaleOf = (panelId: string) => (next: MultiSeriesSpendScale) =>
    setScales((current) => ({ ...current, [panelId]: next }));

  const views = useMemo(() => {
    const map = new Map<string, DashboardPanelView>();
    for (const panel of page.panels) {
      const scaleControls = { scale: scaleOf(panel), onScaleChange: setScaleOf(panel.id) };
      map.set(
        panel.id,
        state === 'empty'
          ? buildEmptySpecPanelView(panel, scaleControls)
          : buildSpecPanelView(panel, keysFor, scaleControls)
      );
    }
    return map;
    // `scaleOf`/`setScaleOf` close over `scales`, which IS a dep below; re-listing the closures
    // themselves would just re-run this on every render, since they are recreated each time — the
    // same dep list the pre-extraction version of this loop already used.
  }, [page, scales, state, keysFor]);

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
            // An errored panel has no view to draw actions from — the card, its title and its
            // Expand button all stay, which is the console's own behaviour and the reason the page
            // never reflows as panels resolve.
            actions={state === 'error' ? null : renderPanelActions(view, 'panel')}>
            {({ size }) =>
              state === 'error' ? (
                // A BARE panel's title is its `StatCard`'s own label, which does not exist when
                // there is no card — so an errored stat panel restates it, exactly as
                // `dashboard-renderer.tsx` does. Without it the page is a column of identical
                // failure lines with nothing saying which reading is missing.
                <div className="flex flex-col gap-2">
                  {panelChrome(panel.type) === 'bare' ? (
                    <span className={LABEL_CLASS}>{panel.title}</span>
                  ) : null}
                  <ErrorLine
                    message="The usage service did not answer. Nothing here is stale — it is absent."
                    onRetry={() => {}}
                    retryLabel="Retry"
                  />
                </div>
              ) : (
                <>
                  {renderPanelBody(view, size)}
                  {state === 'truncated' ? (
                    <InlineStatus className="mt-2">{TRUNCATION_CAPTION}</InlineStatus>
                  ) : null}
                </>
              )
            }
          </DashboardPanel>
        );
      })}
    </DashboardGrid>
  );
}
