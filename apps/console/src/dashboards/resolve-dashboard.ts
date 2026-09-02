import {
  comparisonWindow,
  DEFAULT_COMPARISON_CADENCE,
  type ResetCadence,
  type UsageWindow,
} from '../containers/comparison-window';
import {
  FAMILY_SCOPE,
  isDashboardLens,
  LENS_DIMENSION,
  usageScopes,
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
 *     A substituted `scope` is additionally CHECKED against the closed usage-scope enum
 *     (`assertUsageScope`), because that one field decides whose data comes back.
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
 *  6. **Expands `scope: family`** (C12, converse-frontends#455) into one `scope: account` query per
 *     account in the session's own family — the fan-out `/settings/overview/usage` has always
 *     performed by hand, now expressed in YAML. The members are ordinary queries and are
 *     deduplicated like any other, so two family panels sharing a `group_by` share the whole
 *     fan-out rather than doubling it.
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
  /**
   * Indices into `ResolvedDashboard.queries` for this panel's own data — ONE entry for an ordinary
   * panel, one per family account for a `scope: family` fan-out. Never empty.
   *
   * An array rather than a scalar because a fan-out panel's reading is the COMBINATION of its
   * members: `use-dashboard.ts` merges the responses into one before any adapter sees them, so a
   * panel is loading while any member is, and errors when any member does — the same all-or-
   * nothing honesty the hand-written estate screen had (a half-summed estate total is a wrong
   * number, not a partial one).
   *
   * EMPTY only for a `family` panel on a session whose account family is empty or still loading —
   * which resolves to a real, ready, zero-usage reading, never a permanently-pending panel.
   */
  queryIndices: number[];
  /** `queryIndices[0]` — the convenience read for the overwhelmingly common single-query panel,
   *  and `undefined` for the empty fan-out above. */
  queryIndex?: number;
  /** The comparison-window twin's indices, when `compare: true`. Fans out with the panel. */
  compareQueryIndices?: number[];
  /** `compareQueryIndices[0]`. */
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
  /**
   * The account ids a `scope: family` panel fans out over, ALREADY CAPPED by the caller (the cap
   * is a page-level fact that has to be captioned where the page is drawn, so this module never
   * silently truncates). A page with no family panel may omit it; a page WITH one and an empty
   * list resolves to a fan-out of zero queries, which reads as an empty dashboard rather than an
   * error — a session whose account family has not loaded yet is a real, transient state.
   */
  familyAccountIds?: readonly string[];
}

/** `$name`, or `$name?` for the optional form legal only inside `filters.<key>`. */
const PLACEHOLDER = /^\$([A-Za-z_][A-Za-z0-9_]*)(\?)?$/;

/** What `substitute` returns for an optional placeholder the page has no value for. */
const DROP_FIELD = Symbol('drop');

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
 *
 * `$name?` is the OPTIONAL form: when the page has no value for it, the whole field is DROPPED
 * (`DROP_FIELD`) instead of raising. It exists for exactly one shape — a filter whose neutral
 * position is "no filter at all", such as `/accounts/<id>/overview`'s project picker sitting on
 * "All projects" — and `optionalAllowed` gates it to `filters.<key>`, because dropping a `scope`
 * or a `scope_id` does not widen a query, it changes which thing the query is about.
 */
function substitute(
  value: string,
  filters: DashboardFilters,
  context: { route: string; panelId: string; field: string; optionalAllowed?: boolean }
): string | typeof DROP_FIELD {
  const match = PLACEHOLDER.exec(value);
  if (!match) return value;

  const name = match[1];
  const optional = match[2] === '?';
  if (optional && !context.optionalAllowed) {
    throw new Error(
      `[console] Optional dashboard placeholder "$${name}?" on page "${context.route}", panel ` +
        `"${context.panelId}", field "${context.field}". Optional placeholders are legal only ` +
        'inside `filters.<key>`: dropping a scope or a scope_id does not widen a query, it ' +
        'changes what the query is about.'
    );
  }

  const resolved = filters[name];
  if (resolved === undefined || resolved === '') {
    if (optional) return DROP_FIELD;
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
 * The one field whose SUBSTITUTED value is validated rather than passed through: `scope`.
 *
 * `/admin/usage/actors/[actorId]` writes `scope: $type` and takes `$type` from a URL a person can
 * edit (converse-frontends#449). Every other substituted field is an opaque id the backend either
 * finds or does not; `scope` is a closed enum that decides WHOSE data comes back, so a value
 * outside it is not a query that returns nothing — it is a 400 from the usage backend arriving
 * under a page that has already printed an actor's name above it, and (worse, on the day the enum
 * grows) a query for something the page never meant to ask for. The route 404s an invalid
 * `?type=` before rendering; this is the second, structural line, and it is what makes the YAML
 * safe to read on its own.
 *
 * `api_key` is a member of the enum and therefore accepted here, exactly as `dashboard-spec.ts`
 * declares it — the BACKEND refuses that scope for every caller, and mirroring that refusal in
 * two more places is how the two drift apart.
 *
 * `family` (C12, converse-frontends#455) is accepted too: it is this RESOLVER's own extension, not
 * a wire scope, and it never survives resolution — `expandFamily` below turns it into one
 * `account`-scoped query per family account before anything reaches the wire.
 */
const RESOLVABLE_SCOPES: readonly string[] = [...usageScopes, FAMILY_SCOPE];

function assertUsageScope(scope: string, context: { route: string; panelId: string }): string {
  if (RESOLVABLE_SCOPES.includes(scope)) return scope;
  throw new Error(
    `[console] Invalid usage scope "${scope}" on page "${context.route}", panel ` +
      `"${context.panelId}". A scope substituted from a page filter must be one of ` +
      `${RESOLVABLE_SCOPES.join(', ')} — it decides whose data the panel returns, so an ` +
      'unrecognised value is refused here rather than sent to the usage backend under this ' +
      'panel’s title.'
  );
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
  const substituteField = (value: string, field: string) => {
    const resolved = substitute(value, filters, { ...context, field });
    if (resolved === DROP_FIELD) {
      // Unreachable: only `filters.<key>` passes `optionalAllowed`, and that branch handles the
      // sentinel itself. Stated rather than cast, so a future caller cannot silently smuggle an
      // optional placeholder into `scope`.
      throw new Error(
        `[console] Field "${field}" on page "${context.route}", panel "${context.panelId}" ` +
          'cannot be dropped.'
      );
    }
    return resolved;
  };

  const resolvedFilters = query.filters
    ? Object.fromEntries(
        Object.entries(query.filters)
          .map(([key, value]) => [
            key,
            // A LIST filter (`operation_in`) is a closed vocabulary the backend validates, not
            // page state — every entry is a literal, and substituting into one would mean a single
            // URL knob silently rewriting a set-membership filter.
            Array.isArray(value)
              ? [...value]
              : substitute(value, filters, {
                  ...context,
                  field: `filters.${key}`,
                  optionalAllowed: true,
                }),
          ])
          .filter(([, value]) => value !== DROP_FIELD)
      )
    : undefined;

  const groupBy = lens ? applyLens(query.group_by, lens) : query.group_by;

  return {
    // `scope: all` with an empty `scope_id` is the estate-wide default the backend documents
    // (`scope_id` is ignored for that scope and callers send `""`), so it is the ONLY place an
    // empty id is legitimate — and it comes from this default, never from a failed substitution.
    scope: query.scope ? assertUsageScope(substituteField(query.scope, 'scope'), context) : 'all',
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
 * One resolved query, or — for `scope: family` — one per family account.
 *
 * The fan-out members are ordinary `scope: account` queries: nothing downstream needs to know they
 * came from a family panel except `use-dashboard.ts`, which merges their responses. The account id
 * is carried in each member's own `scope_id`, which is what lets that merge attribute every point
 * even when the response echoes no `account_id` of its own.
 */
function resolveQueries(
  query: DashboardQuerySpec,
  window: UsageWindow,
  filters: DashboardFilters,
  familyAccountIds: readonly string[],
  context: { route: string; panelId: string },
  lens: DashboardLens | undefined
): ResolvedQuery[] {
  const base = resolveQuery(query, window, filters, context, lens);
  if (base.scope !== FAMILY_SCOPE) return [base];
  return familyAccountIds.map((accountId) => ({ ...base, scope: 'account', scope_id: accountId }));
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
  familyAccountIds = [],
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

    const queryIndices = resolveQueries(
      spec.query,
      effectiveWindow,
      filters,
      familyAccountIds,
      context,
      lens
    ).map((query) => intern(queries, index, query));

    const base = { spec, queryIndices, queryIndex: queryIndices[0], lens, link };
    if (!spec.compare || !comparison) return base;

    const compareQueryIndices = resolveQueries(
      spec.query,
      comparison.previous,
      filters,
      familyAccountIds,
      context,
      lens
    ).map((query) => intern(queries, index, query));

    return {
      ...base,
      compareQueryIndices,
      compareQueryIndex: compareQueryIndices[0],
      compareCadence: comparison.cadence,
      compareShiftMs: comparison.current.start.getTime() - comparison.previous.start.getTime(),
    };
  });

  return { route: page.route, queries, panels, window: effectiveWindow };
}
