import { DASHBOARD_PANEL_TYPES } from '@lightbridge/ui-web/src/sections/dashboard-panels';
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
export const DERIVED_METRICS = ['avgCostPerMillionTokens', 'activeActors', 'chatCount'] as const;
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
    filters: z.record(z.string().min(1), placeholderOrLiteral).optional(),
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
    /** Which entity a breakdown ranks. `user` first, per the owner's actor-identity rule. */
    lens: z.enum(['user', 'account', 'project']).optional(),
    /** Rows/wedges before the `Other (N)` collapse. Omit to take the panel size's own default. */
    topN: z.number().int().positive().optional(),
    /** A route TEMPLATE with `:key` standing for the row's own group-by value, e.g.
     *  `/admin/usage/actors/:key?type=user`. Turns ranked rows and table rows into real anchors. */
    link: z.string().min(1).optional(),
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
