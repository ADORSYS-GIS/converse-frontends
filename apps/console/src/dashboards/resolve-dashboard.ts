import {
  comparisonWindow,
  DEFAULT_COMPARISON_CADENCE,
  type ResetCadence,
  type UsageWindow,
} from '../containers/comparison-window';
import {
  isDashboardLens,
  LENS_DIMENSION,
  type DashboardLens,
  type DashboardPageSpec,
  type DashboardPanelSpec,
  type DashboardQuerySpec,
} from './dashboard-spec';

/**
 * Spec + page filters → a concrete, DEDUPLICATED query list plus a per-panel index into it
 * (converse-frontends#446, decision D-K).
 *
 * This is the module the whole engine turns on, and it is deliberately the dullest one: no React,
 * no DOM API, no query client, no clock reads it was not handed (the non-functional AC — C10
 * executes this exact function server-side to build the PDF report from the same page entry the
 * browser rendered).
 *
 * What it does, in order:
 *
 *  1. **Substitutes `$param` placeholders** from the page's own filters (`scope_id: $actorId`,
 *     `scope: $type`, `filters.azp: $channelId`). An unresolved placeholder is an ERROR, never an
 *     empty string — `scope_id: ''` on an `account` scope is not "no actor", it is a malformed
 *     query, and on `scope: all` it would silently widen a per-actor panel to the whole estate.
 *  2. **Applies the range** — always, to every panel. The page owns the window; a panel never
 *     carries dates of its own.
 *  3. **Resolves `bucket: auto`** by the range rule (≤7d → `1 hour`, ≤90d → `1 day`, else
 *     `7 days`), and always emits an explicit `limit`.
 *  4. **Adds the comparison twin** for `compare: true`, through the shared `comparisonWindow`
 *     helper (D-F) — the twin is an ordinary query and is deduplicated like any other.
 *  4b. **Applies the LENS** (converse-frontends#448) — a panel declaring `options.lens` has the
 *     first dimension of its `group_by` swapped for the page's effective lens
 *     (`?lens=user|account|project`, else the panel's own YAML default), and `$lens` in its
 *     `options.link` resolved to the same value. One YAML panel, three readings; the dedupe below
 *     then folds every lens-driven panel on the page into one request, because they all end up
 *     asking the same question.
 *  5. **Deduplicates** on a stable key derived from the fully-resolved query, so every ungrouped
 *     `stat` panel on a page shares ONE request. `/admin/overview` today fires one query per board
 *     varying only `group_by`, and the identical ungrouped ones are not shared; that is the waste
 *     this closes.
 */

/** Values a page can inject into its panels' `$param` placeholders. */
export type DashboardFilters = Record<string, string | undefined>;

/** A resolved query, ready to become a `UsageQueryRequest`. `filters` is a plain string map rather
 *  than the generated `UsageQueryFilters` so a page can name a dimension (`azp`, `operation`,
 *  `billing_plan`) that lane A3 has not landed yet — the cast happens once, at the wire boundary
 *  in `use-dashboard.ts`. */
export interface ResolvedQuery {
  scope: string;
  scope_id: string;
  start_time: string;
  end_time: string;
  bucket: string;
  group_by?: string[];
  /** A list value is the backend's one set-membership filter, `operation_in`
   *  (lightbridge-authz#648) — every other filter is a plain equality string. */
  filters?: Record<string, string | string[]>;
  limit: number;
}

export interface ResolvedPanel {
  spec: DashboardPanelSpec;
  /** Index into `ResolvedDashboard.queries` for this panel's own data. */
  queryIndex: number;
  /** Index of the comparison-window twin, when `compare: true`. */
  compareQueryIndex?: number;
  /** Which cadence the comparison was computed against — the delta's wording comes from it. */
  compareCadence?: ResetCadence;
  /**
   * How far FORWARD the comparison window's own timestamps must be shifted to sit under the
   * current window (`current.start - previous.start`, in ms).
   *
   * A `stat` panel never needs it — a total is a scalar. A `series` panel does: plotting the
   * previous window at its real dates would double the chart's x-domain and squeeze the current
   * period into half the board, which is exactly the defect the 2026-08-31 owner finding ("the
   * graphs are literally completely different") was about. Computed here rather than in the
   * adapter because this is the only module that knows both windows.
   */
  compareShiftMs?: number;
  /**
   * Which entity this panel is about, when it declares `options.lens` — the page's `?lens=` knob
   * if it set one, else the panel's own YAML default. `undefined` on a panel that is not
   * lens-driven at all, so an adapter can tell "this panel has no lens" from "this panel's lens is
   * user", which is the difference between a table with a Type column and one without.
   */
  lens?: DashboardLens;
  /**
   * `options.link` with `$lens` already substituted; `:key` is still the row's own placeholder and
   * is filled per row by `panelRowHref`. Resolved HERE because this is the module that knows the
   * effective lens, and because C10's server-side report walk needs the same hrefs the page draws.
   */
  link?: string;
}

export interface ResolvedDashboard {
  route: string;
  /** Deduplicated. Two panels whose resolved queries are byte-identical point at one entry here. */
  queries: ResolvedQuery[];
  panels: ResolvedPanel[];
  /** The window every non-comparison query was built over, after any comparison snapping. */
  window: UsageWindow;
}

export interface ResolveDashboardInput {
  page: DashboardPageSpec;
  /** The page's resolved UTC window — `resolveOverviewWindow`'s output (`overview-usage.ts`), so
   *  `range`/`from`/`to` are already reconciled before they reach here. */
  window: UsageWindow;
  /** `$param` values: route params (`actorId`, `type`, `channelId`) and URL knobs (`lens`). */
  filters?: DashboardFilters;
  /** The actor's reset cadence, when one is known. Estate pages omit it and get the monthly rule
   *  (D-F / owner Q8). */
  resetCadence?: ResetCadence;
}

const PLACEHOLDER = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;

const DAY_MS = 86_400_000;

/** The `bucket: auto` rule, stated once. Widths are the interval strings the usage backend's own
 *  `validate_bucket_interval` accepts — `7 days`, never `1 week` (which it refuses outright). */
export function autoBucket(window: UsageWindow): string {
  const days = (window.end.getTime() - window.start.getTime()) / DAY_MS;
  if (days <= 7) return '1 hour';
  if (days <= 90) return '1 day';
  return '7 days';
}

/**
 * Substitutes one field. A bare `$name` is a placeholder; anything else is a literal (there is no
 * interpolation INSIDE a longer string — a half-substituted `scope_id` would be a silently wrong
 * query, and no page has ever needed one).
 */
function substitute(
  value: string,
  filters: DashboardFilters,
  context: { route: string; panelId: string; field: string }
): string {
  const match = PLACEHOLDER.exec(value);
  if (!match) return value;

  const name = match[1];
  const resolved = filters[name];
  if (resolved === undefined || resolved === '') {
    throw new Error(
      `[console] Unresolved dashboard placeholder "$${name}" on page "${context.route}", ` +
        `panel "${context.panelId}", field "${context.field}". The page must supply it in ` +
        '`filters` — an unresolved placeholder is never treated as an empty value, because an ' +
        'empty scope_id would silently query something other than what the panel says.'
    );
  }
  return resolved;
}

/**
 * A lens-driven panel's `group_by`, with its FIRST dimension swapped for the effective lens's own.
 *
 * Only the first: a lens says what a row IS, and every dimension after it is there to widen the
 * dedupe (a panel that lists `[user_id, account_id]` shares a request with one that lists
 * `[account_id, user_id]`, and each reads its own first entry — the mechanism `/admin/overview`'s
 * adoption panels already rely on). Swapping them all would collapse two dimensions into one and
 * quietly change how coarse the query is.
 *
 * A lens-driven panel with no `group_by` at all is given the lens dimension outright, so the
 * option always means something rather than being silently ignored.
 */
function applyLens(groupBy: string[] | undefined, lens: DashboardLens): string[] {
  const dimension = LENS_DIMENSION[lens];
  if (!groupBy || groupBy.length === 0) return [dimension];
  return [dimension, ...groupBy.slice(1).filter((entry) => entry !== dimension)];
}

function resolveQuery(
  query: DashboardQuerySpec,
  window: UsageWindow,
  filters: DashboardFilters,
  context: { route: string; panelId: string },
  lens: DashboardLens | undefined
): ResolvedQuery {
  const substituteField = (value: string, field: string) =>
    substitute(value, filters, { ...context, field });

  const resolvedFilters = query.filters
    ? Object.fromEntries(
        Object.entries(query.filters).map(([key, value]) => [
          key,
          // A LIST filter (`operation_in`) is a closed vocabulary the backend validates, not
          // page state — every entry is a literal, and substituting into one would mean a single
          // URL knob silently rewriting a set-membership filter.
          Array.isArray(value) ? [...value] : substituteField(value, `filters.${key}`),
        ])
      )
    : undefined;

  const groupBy = lens ? applyLens(query.group_by, lens) : query.group_by;

  return {
    // `scope: all` with an empty `scope_id` is the estate-wide default the backend documents
    // (`scope_id` is ignored for that scope and callers send `""`), so it is the ONLY place an
    // empty id is legitimate — and it comes from this default, never from a failed substitution.
    scope: query.scope ? substituteField(query.scope, 'scope') : 'all',
    scope_id: query.scope_id ? substituteField(query.scope_id, 'scope_id') : '',
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    bucket: !query.bucket || query.bucket === 'auto' ? autoBucket(window) : query.bucket,
    group_by: groupBy && groupBy.length > 0 ? [...groupBy] : undefined,
    filters:
      resolvedFilters && Object.keys(resolvedFilters).length > 0 ? resolvedFilters : undefined,
    limit: query.limit,
  };
}

/**
 * A stable, order-independent identity for a resolved query — two panels share a request exactly
 * when this string matches.
 *
 * Every part is normalized so a difference that does not change what the backend returns cannot
 * split a request in two: `group_by` and `filters` are sorted, and `undefined` is written out as
 * a sentinel rather than dropped (so `group_by: []` and no `group_by` at all are the same key, but
 * `group_by: ['model']` is not). Conversely, NOTHING is dropped from the key that does change the
 * result — a near-identical query (a different bucket, one extra filter) stays its own request.
 */
export function queryKey(query: ResolvedQuery): string {
  const groupBy = query.group_by ? [...query.group_by].sort().join(',') : '';
  const filters = query.filters
    ? Object.entries(query.filters)
        .sort(([a], [b]) => a.localeCompare(b))
        // A list filter is normalized the same way `group_by` is — SORTED, because
        // `operation_in: [a, b]` and `[b, a]` are the same question and must share one request.
        .map(
          ([key, value]) => `${key}=${Array.isArray(value) ? [...value].sort().join('+') : value}`
        )
        .join('&')
    : '';
  return [
    query.scope,
    query.scope_id,
    query.start_time,
    query.end_time,
    query.bucket,
    groupBy,
    filters,
    String(query.limit),
  ].join('|');
}

/** Adds `query` to `queries` if it is new; returns the index either way. */
function intern(
  queries: ResolvedQuery[],
  index: Map<string, number>,
  query: ResolvedQuery
): number {
  const key = queryKey(query);
  const existing = index.get(key);
  if (existing !== undefined) return existing;
  const next = queries.length;
  queries.push(query);
  index.set(key, next);
  return next;
}

export function resolveDashboard({
  page,
  window,
  filters = {},
  resetCadence,
}: ResolveDashboardInput): ResolvedDashboard {
  const queries: ResolvedQuery[] = [];
  const index = new Map<string, number>();

  // The comparison pair is computed ONCE for the page, not per panel: every panel on a page shares
  // one window, so a per-panel computation would produce identical windows and only give the
  // dedupe more work to undo. It also decides the CURRENT window when a comparison widened it —
  // both sides of a comparison must be the same length, which means the panels that do NOT
  // compare have to move with it, or two panels on one page would report different totals for
  // what the range picker calls the same window.
  const wantsCompare = page.panels.some((panel) => panel.compare);
  const cadence = resetCadence ?? DEFAULT_COMPARISON_CADENCE;
  const comparison = wantsCompare ? comparisonWindow(window, cadence) : undefined;
  const effectiveWindow = comparison?.current ?? window;

  // The page's own lens knob, narrowed once. An unrecognised `?lens=` value is IGNORED rather than
  // thrown on: it comes from a URL a person can type, and every lens-driven panel still has its own
  // YAML default to fall back to — unlike a `$param` placeholder, which has no honest fallback and
  // therefore does throw.
  const pageLens = isDashboardLens(filters.lens) ? filters.lens : undefined;

  const panels: ResolvedPanel[] = page.panels.map((spec) => {
    const context = { route: page.route, panelId: spec.id };
    const lens = spec.options?.lens ? (pageLens ?? spec.options.lens) : undefined;
    const link =
      spec.options?.link && lens ? spec.options.link.replaceAll('$lens', lens) : spec.options?.link;
    const queryIndex = intern(
      queries,
      index,
      resolveQuery(spec.query, effectiveWindow, filters, context, lens)
    );

    if (!spec.compare || !comparison) return { spec, queryIndex, lens, link };

    return {
      spec,
      queryIndex,
      lens,
      link,
      compareQueryIndex: intern(
        queries,
        index,
        resolveQuery(spec.query, comparison.previous, filters, context, lens)
      ),
      compareCadence: comparison.cadence,
      compareShiftMs: comparison.current.start.getTime() - comparison.previous.start.getTime(),
    };
  });

  return { route: page.route, queries, panels, window: effectiveWindow };
}
