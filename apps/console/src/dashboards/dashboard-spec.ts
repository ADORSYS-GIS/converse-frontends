// The narrow `/types` path, NOT the section's barrel. The barrel re-exports `panel-renderers.tsx`,
// which pulls in `useEffect`/`useState` through the chart primitives — and this module now sits on
// TWO server import paths at once: `/admin/overview`'s server component, which reads the YAML
// before rendering anything (#447), and `/api/reports/page`'s Route Handler (#453). Either one is
// enough to fail the Turbopack build outright ("You're importing a module that depends on
// `useEffect` into a React Server Component"). `types.ts` is the vocabulary and nothing else:
// every one of its own imports is `import type`, so it erases completely.
import { DASHBOARD_PANEL_TYPES } from '@lightbridge/ui-web/src/sections/dashboard-panels/types';
import { z } from 'zod';

/**
 * The schema `apps/console/dashboards.yaml` is validated against (converse-frontends#446,
 * decision D-K — "the dashboards are basically fetch(filters x type x parameters) = data; we
 * externalize the list of type x parameters into a dashboards.yaml").
 *
 * Two properties this module is responsible for, both of which are acceptance criteria rather
 * than preferences:
 *
 *  - **Nothing is silently skipped.** An unknown panel `type`, an unknown `derived:` name, a
 *    `span` of 3, a missing `limit` — each is a parse ERROR naming the page and the panel id
 *    (`formatDashboardIssues` below), never a panel that quietly renders nothing. `load-
 *    dashboards.ts` turns that into a fail-loud startup error; `dashboard-spec.test.ts` asserts
 *    both the accept and the reject side against real fixtures.
 *  - **The vocabulary is stated ONCE.** `panelType` is built from `ui-web`'s own
 *    `DASHBOARD_PANEL_TYPES`, the same array the renderer registry is keyed on, so a type can
 *    never exist in YAML without a renderer or vice versa. `DERIVED_METRICS` is likewise the
 *    single list `derived-metrics.ts` implements.
 *
 * **No React, no DOM, no query client** — this module and `resolve-dashboard.ts` are both plain
 * values so C10 can execute the same spec server-side for the PDF report (a non-functional AC).
 */

/** Metrics a panel can read straight off a usage response point. */
export const BASE_METRICS = ['cost', 'requests', 'tokens', 'latency'] as const;
export type BaseMetric = (typeof BASE_METRICS)[number];

/**
 * Metrics that are COMPUTED from a response rather than read off it — each one a named pure
 * function in `derived-metrics.ts`, each unit-tested. Written in YAML as `derived:<name>`.
 *
 * Kept as a closed list on purpose: `metric: derived:whateverIFeltLike` must fail validation, not
 * resolve to `undefined` at render time and draw an empty panel.
 */
export const DERIVED_METRICS = [
  'avgCostPerMillionTokens',
  'costPerRequest',
  'activeActors',
  'chatCount',
  'activeActorsPerBucket',
] as const;
export type DerivedMetricName = (typeof DERIVED_METRICS)[number];

export const DERIVED_METRIC_PREFIX = 'derived:';

/** `'cost'` | … | `` `derived:${name}` `` — the wire form a panel's `metric` field takes. */
export type DashboardMetric = BaseMetric | `${typeof DERIVED_METRIC_PREFIX}${DerivedMetricName}`;

const derivedMetricValues = DERIVED_METRICS.map(
  (name) => `${DERIVED_METRIC_PREFIX}${name}` as const
);

const metricSchema = z.union([
  z.enum(BASE_METRICS),
  z.enum(derivedMetricValues as unknown as [string, ...string[]]),
]) as unknown as z.ZodType<DashboardMetric>;

/**
 * A `$param` placeholder, or a literal. Deliberately a plain string rather than a branded type:
 * the YAML author writes `scope_id: $actorId` and `resolve-dashboard.ts` substitutes it — this
 * schema only guarantees the field is a string, and an UNRESOLVED placeholder is an error raised
 * by the resolver (where the page's actual filters are known), not here.
 *
 * A trailing `?` (`$project?`) marks the placeholder OPTIONAL, and is legal only inside
 * `filters.<key>` — see `resolve-dashboard.ts`'s `substitute`. It means "drop this filter when the
 * page has no value for it", which is what an account dashboard needs for a project picker whose
 * neutral position is "all projects". It is deliberately NOT legal on `scope`/`scope_id`: a
 * dropped scope is not a narrower query, it is a different one.
 */
const placeholderOrLiteral = z.string().min(1);

/**
 * Bucket width. `'auto'` derives it from the resolved range (≤7d → `1 hour`, ≤90d → `1 day`, else
 * `7 days`); any other value is passed through verbatim, so a page can pin a width the backend
 * accepts (`^\d+\s+(second|minute|hour|day)s?$` — `overview-usage.ts`'s own note on why `1 week`
 * is refused and `7 days` is not).
 */
const bucketSchema = z.union([z.literal('auto'), z.string().min(1)]);

export const usageScopes = ['user', 'api_key', 'project', 'account', 'all'] as const;

/**
 * The three entities an "actor" panel can be ABOUT (converse-frontends#448, story C5). Users
 * first, always — the owner's actor-identity rule, and the order the lens `SegmentedControl`
 * renders in.
 */
export const DASHBOARD_LENSES = ['user', 'account', 'project'] as const;
export type DashboardLens = (typeof DASHBOARD_LENSES)[number];

/**
 * A lens → the `group_by` dimension (and `UsageSeriesPoint` field) it reads.
 *
 * This is the whole mechanism behind "one panel, three lenses": a panel that declares
 * `options.lens` has the FIRST dimension of its `group_by` replaced by this map's entry for the
 * page's effective lens (`resolve-dashboard.ts`). The YAML still states a real, honest default
 * dimension — `group_by: [user_id]` with `options.lens: user` — rather than a placeholder that
 * means nothing on its own, so a page entry read in isolation still says what it queries.
 */
export const LENS_DIMENSION: Record<DashboardLens, string> = {
  user: 'user_id',
  account: 'account_id',
  project: 'project_id',
};

export function isDashboardLens(value: string | undefined): value is DashboardLens {
  return value !== undefined && (DASHBOARD_LENSES as readonly string[]).includes(value);
}

/**
 * The columns a `table` panel may declare, as a closed vocabulary (`options.columns`).
 *
 * A table panel used to be exactly one shape — label, cost, requests, tokens — which is right for
 * `/admin/overview`'s top-spender ledgers and wrong for both of `/admin/usage`'s tables: the actor
 * table owes an operator a TYPE (which lens a row belongs to) and a LAST ACTIVE reading, and the
 * channel table has no token column worth printing at all. Declaring the column list is what keeps
 * that a YAML decision rather than an `if (isActorTable)` in the adapter.
 *
 * Closed on purpose: `columns: [spend]` must fail validation naming the page and the panel, not
 * render a header over an empty column.
 */
export const DASHBOARD_TABLE_COLUMNS = [
  'label',
  'type',
  'cost',
  'requests',
  'tokens',
  'lastActive',
] as const;
export type DashboardTableColumnId = (typeof DASHBOARD_TABLE_COLUMNS)[number];

/** What a `table` panel draws when it declares no `columns` — `/admin/overview`'s two
 *  top-spender ledgers, unchanged by this vocabulary existing. */
export const DEFAULT_TABLE_COLUMNS: readonly DashboardTableColumnId[] = [
  'label',
  'cost',
  'requests',
  'tokens',
];

/**
 * The one scope that is NOT a `UsageScope` — a resolver extension added by C12
 * (converse-frontends#455) for `/settings/overview/usage`.
 *
 * That page is the operator's own ACCOUNT FAMILY, not the estate: `scope: all` is gated on
 * `usage:read-all` and answers for every account on the deployment, which is a different (and for
 * most signed-in people, forbidden) question. The usage API has no "every account I can see"
 * scope either — filed as lightbridge-authz#578 — so the honest expression of that page is a
 * FAN-OUT: one `scope: account` query per account in the session's own family, capped, combined
 * client-side, with the cap stated in a caption.
 *
 * `resolve-dashboard.ts` expands a `family`-scoped panel into one resolved query per supplied
 * account id, and `use-dashboard.ts` merges their responses into one before the adapters see it —
 * stamping each point's `account_id` from the query it came from, so a by-account panel can
 * attribute rows even if the backend echoed nothing. The panels themselves are ordinary YAML.
 */
export const FAMILY_SCOPE = 'family';

/**
 * `group_by` is a plain string array, not the generated `UsageGroupBy` enum, and that is
 * deliberate: lane A3 adds `azp` / `operation` / `billing_plan` as first-class dimensions, and a
 * page must be authorable (and reviewable in Storybook, against fixtures) BEFORE that column
 * lands — which is half the point of externalizing the dashboards. The wire cast happens once, at
 * the query boundary in `use-dashboard.ts`, with that reason stated there.
 */
export const dashboardQuerySchema = z
  .object({
    scope: placeholderOrLiteral.optional(),
    scope_id: placeholderOrLiteral.optional(),
    group_by: z.array(z.string().min(1)).optional(),
    /**
     * Equality filters, plus the ONE set-membership filter the backend offers: `operation_in`
     * (lightbridge-authz#648) takes a list. A list value is modelled here generically rather than
     * as a named `operation_in` field so the schema does not have to be edited again the next time
     * the backend grows a `*_in` filter — the wire cast is still the single one in
     * `use-dashboard.ts`, and an unknown filter key is the backend's 400 to raise, exactly as it
     * already is for an unknown `group_by` dimension.
     *
     * An EMPTY list is refused here rather than sent: `operation = ANY('{}')` is false for every
     * row, so it is a filter that can only ever return nothing while looking like a real question
     * — the same reasoning (and the same refusal) as the backend's own `UsageQueryFilters::
     * validate`, caught one hop earlier.
     */
    filters: z
      .record(z.string().min(1), z.union([placeholderOrLiteral, z.array(z.string().min(1)).min(1)]))
      .optional(),
    bucket: bucketSchema.optional(),
    /**
     * ALWAYS explicit, never left to a server default (console-ui skill: "every usage request sets
     * `limit` explicitly; a fan-out that caps its own scope says so in its caption"). A wide
     * window at an hourly bucket is a real "how many rows could this return" unknown.
     */
    limit: z.number().int().positive(),
  })
  .strict();

export type DashboardQuerySpec = z.infer<typeof dashboardQuerySchema>;

export const panelOptionsSchema = z
  .object({
    /** `series`/`latency-series` only — the initial axis transform. */
    scale: z.enum(['linear', 'log', 'indexed']).optional(),
    /**
     * Which entity a breakdown ranks, and the panel's DEFAULT when the page's own `?lens=` knob is
     * unset. `user` first, per the owner's actor-identity rule.
     *
     * Declaring it is what makes a panel lens-DRIVEN: `resolve-dashboard.ts` swaps the first
     * `group_by` dimension for `LENS_DIMENSION[effective lens]`, and `$lens` in `options.link`
     * resolves to the same value — so one YAML panel serves all three lenses without the page
     * holding three of them.
     */
    lens: z.enum(DASHBOARD_LENSES).optional(),
    /** Rows/wedges before the `Other (N)` collapse. Omit to take the panel size's own default. */
    topN: z.number().int().positive().optional(),
    /** A route TEMPLATE with `:key` standing for the row's own group-by value, e.g.
     *  `/admin/usage/actors/:key?type=user`. Turns ranked rows and table rows into real anchors. */
    link: z.string().min(1).optional(),
    /**
     * `table` only — what one row IS, singular and capitalised ("Account", "Project"). It is the
     * first column's header. The default is `Actor`, which is right for a `user_id` table and a
     * quiet lie on a table of accounts: a column header is a claim about what the rows are, and
     * `/admin/overview` ranks accounts and projects, not actors.
     */
    rowLabel: z.string().min(1).optional(),
    /** `table` only — the PLURAL noun `Pagination` counts in ("accounts", "projects"). Defaults
     *  to `actors`, and must move together with `rowLabel` for the same reason. */
    unit: z.string().min(1).optional(),
    /** `table` only — which columns the ledger draws, in order. Omit for `DEFAULT_TABLE_COLUMNS`. */
    columns: z.array(z.enum(DASHBOARD_TABLE_COLUMNS)).min(1).optional(),
    /**
     * Which of the query's `group_by` dimensions this panel READS, when it is not the first one.
     * `none` reads no dimension at all — the panel plots/sums the response's ungrouped total.
     *
     * Added by C12 (converse-frontends#455) for one concrete reason. `group_by` order is what lets
     * several panels share one request (`queryKey` sorts the dimensions, each panel reads its own
     * first one — `/admin/overview` already leans on it), and that is worth far more under a
     * `family` fan-out, where every distinct query shape costs N requests rather than one. The one
     * reading order cannot express is "the estate total", which is not any dimension: hence
     * `dimension: none` rather than a second, ungrouped fan-out of 25 more requests.
     */
    dimension: z.string().min(1).optional(),
  })
  .strict();

export type DashboardPanelOptions = z.infer<typeof panelOptionsSchema>;

export const panelSpecSchema = z
  .object({
    /** Unique within its page — it is the React key, the query-dedupe attribution, the panel's
     *  heading element id, and what a fail-loud validation error names. */
    id: z.string().min(1),
    type: z.enum(DASHBOARD_PANEL_TYPES),
    title: z.string().min(1),
    subtitle: z.string().min(1).optional(),
    /** `1` = one grid column; `2` = both, at every breakpoint. */
    span: z.union([z.literal(1), z.literal(2)]),
    query: dashboardQuerySchema,
    metric: metricSchema,
    /** Adds the D-F comparison-window twin query and a delta on the panel. */
    compare: z.boolean().optional(),
    options: panelOptionsSchema.optional(),
  })
  .strict();

export type DashboardPanelSpec = z.infer<typeof panelSpecSchema>;

export const pageSpecSchema = z
  .object({
    /** The router path this page entry describes — the same string the App Router uses, with
     *  `[param]` segments written as they appear in the route. */
    route: z.string().startsWith('/'),
    /**
     * Which URL params / route params this page owns, and therefore which `$name` placeholders a
     * panel on it may reference. `range` is implicit on every page (it is always applied) and
     * need not be listed.
     */
    filters: z.array(z.string().min(1)),
    panels: z.array(panelSpecSchema).min(1),
  })
  .strict()
  .superRefine((page, ctx) => {
    const seen = new Set<string>();
    for (const panel of page.panels) {
      if (seen.has(panel.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['panels'],
          message: `duplicate panel id "${panel.id}" on page "${page.route}"`,
        });
      }
      seen.add(panel.id);
    }
  });

export type DashboardPageSpec = z.infer<typeof pageSpecSchema>;

export const dashboardsFileSchema = z
  .object({
    pages: z.array(pageSpecSchema).min(1),
  })
  .strict()
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    for (const page of file.pages) {
      if (seen.has(page.route)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages'],
          message: `duplicate page route "${page.route}"`,
        });
      }
      seen.add(page.route);
    }
  });

export type DashboardsFile = z.infer<typeof dashboardsFileSchema>;

/** `derived:activeActors` → `activeActors`; a base metric → `null`. */
export function derivedMetricName(metric: DashboardMetric): DerivedMetricName | null {
  if (!metric.startsWith(DERIVED_METRIC_PREFIX)) return null;
  return metric.slice(DERIVED_METRIC_PREFIX.length) as DerivedMetricName;
}

/**
 * A zod failure turned into the one-line-per-problem message the AC asks a failed startup to
 * print: **naming the offending page and panel id**, not just a dotted array index a reader has
 * to count out by hand.
 *
 * Takes the raw (unvalidated) document alongside the error so it can look the route/id up even
 * when the surrounding object failed validation — reading them out of the error path alone is
 * impossible, since the path is positional.
 */
export function formatDashboardIssues(error: z.ZodError, raw: unknown): string {
  const pages = (raw as { pages?: unknown[] } | null | undefined)?.pages;
  return error.issues
    .map((issue) => {
      const [, pageIndex, panelsKey, panelIndex] = issue.path;
      const page =
        Array.isArray(pages) && typeof pageIndex === 'number'
          ? (pages[pageIndex] as { route?: unknown; panels?: unknown[] } | undefined)
          : undefined;
      const route = typeof page?.route === 'string' ? page.route : undefined;
      const panel =
        panelsKey === 'panels' && Array.isArray(page?.panels) && typeof panelIndex === 'number'
          ? (page.panels[panelIndex] as { id?: unknown } | undefined)
          : undefined;
      const panelId = typeof panel?.id === 'string' ? panel.id : undefined;

      const where = [
        route ? `page "${route}"` : undefined,
        panelId ? `panel "${panelId}"` : undefined,
        issue.path.length > 0 ? `at ${issue.path.join('.')}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');

      return where ? `  - ${where}: ${issue.message}` : `  - ${issue.message}`;
    })
    .join('\n');
}

/**
 * Parses and validates a dashboards document. Never returns a partial value: either the whole
 * file is valid, or this throws with every problem listed, each naming its page and panel.
 */
export function parseDashboardsFile(raw: unknown, sourceLabel: string): DashboardsFile {
  const result = dashboardsFileSchema.safeParse(raw);
  if (result.success) return result.data;
  throw new Error(
    `[console] Invalid dashboards document at "${sourceLabel}":\n${formatDashboardIssues(result.error, raw)}`
  );
}

/** The page entry for `route`, or `undefined`. Routes are compared literally — a page's entry key
 *  IS the router path, `[param]` segments included. */
export function findPage(file: DashboardsFile, route: string): DashboardPageSpec | undefined {
  return file.pages.find((page) => page.route === route);
}
