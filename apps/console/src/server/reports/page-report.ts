import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  isOverviewRange,
  rangeLabels,
  resolveOverviewWindow,
  type OverviewRange,
} from '../../containers/overview-usage';
import type { Translate } from '../../i18n/config';
import { loadDashboards } from '../../dashboards/load-dashboards';
import { FAMILY_SCOPE, findPage, type DashboardPageSpec } from '../../dashboards/dashboard-spec';
import { resolveDashboard, type ResolvedDashboard } from '../../dashboards/resolve-dashboard';
import { translateDashboardPage } from '../../dashboards/page-entry';
import { assertSafeRouteSegments } from './template-resolver';
import type { ReportBranding } from './report-branding';
import { buildReport, type BuiltReport } from './report-data';

/**
 * Turning `?path=…&range=…&<filters>` into a resolved dashboard (converse-frontends#453).
 *
 * **`path` is a ROUTE PATTERN, not a URL.** The caller sends `/admin/usage/actors/[actorId]` —
 * the `dashboards.yaml` key, `[param]` segments and all — with the param VALUES as separate query
 * params (`actorId=abc123`). Two reasons, and the second is the security one:
 *
 *  1. It is the key. The page already knows which YAML entry it renders, and a report is a
 *     rendering of that entry; making the route the identity means a concrete URL never has to be
 *     matched back to a pattern by a hand-written matcher — the exact place a mismatch would hide.
 *  2. `path` is therefore validated by EQUALITY against the routes `dashboards.yaml` declares, not
 *     by pattern matching or path normalisation. `../../etc` is not a declared route, so it is
 *     refused before anything touches the filesystem, and the only string ever joined into a
 *     template path is one this process read out of its own document.
 *
 * `resolveDashboard` is C3's, unchanged and React-free, which is the acceptance criterion this
 * function exists to satisfy: "there is no second, divergent query implementation".
 */

export type PageReportFailure =
  | { kind: 'unknown_route'; route: string; known: string[] }
  | { kind: 'invalid_filter'; message: string }
  /** A page whose panels fan out over the caller's own account family (`scope: family`, C12 /
   *  converse-frontends#455). See `resolvePageReport`'s guard for why that cannot be answered
   *  here. */
  | { kind: 'unexportable_route'; route: string; message: string };

export type PageReportResolution =
  | { ok: true; page: DashboardPageSpec; resolved: ResolvedDashboard; context: ReportContext }
  | { ok: false; failure: PageReportFailure };

export interface ReportContext {
  route: string;
  title: string;
  rangeLabel: string;
  /** `{label, value}` pairs for the header — the page's own declared filters, with their values. */
  filters: { label: string; value: string }[];
  /** The download's file stem, `[param]` segments already substituted. */
  slug: string;
}

/** Every route a report can be asked for. Exported so a test can assert that each one has a
 *  template, and so the 404 can NAME what it would have accepted. */
export function knownReportRoutes(): string[] {
  return loadDashboards().pages.map((page) => page.route);
}

/**
 * A route pattern → the report's title.
 *
 * Derived from the route rather than read from the YAML or accepted from the caller. The spec
 * schema has no `title` field (C3 shipped it without one, and adding one here would collide with
 * the migration slices that own that file), and a caller-supplied title is text this console would
 * be printing into a document on someone's behalf. Deriving it is deterministic, needs no trust,
 * and matches what the page's own `PageHeader` says closely enough to be recognisable.
 */
export function deriveReportTitle(route: string): string {
  const words = route
    .split('/')
    .filter((segment) => segment.length > 0 && !segment.startsWith('['))
    .map((segment) =>
      segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    );
  return words.length > 0 ? words.join(' · ') : 'Report';
}

/** The download's file stem: the route with its `[param]` segments replaced by the actual values,
 *  flattened to one lowercase, hyphenated token. A reader with two actor reports open can tell
 *  them apart by the file name. */
export function reportSlug(route: string, filters: Record<string, string | undefined>): string {
  const segments = assertSafeRouteSegments(route).map((segment) => {
    const match = /^\[(.+)]$/.exec(segment);
    if (!match) return segment;
    return filters[match[1]] ?? match[1];
  });
  return (
    segments
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'report'
  );
}

/**
 * `range` from the URL, defaulted the same way every dashboard page defaults it (`mtd`).
 *
 * Validated by `isOverviewRange` — `overview-usage.ts`, a pure module — rather than against
 * `client/url-state.ts`'s `OVERVIEW_RANGES`. The two lists are the same vocabulary, but
 * `url-state.ts` pulls `nuqs` in, and a Route Handler that imports it does not get a plain array
 * back: the built standalone server threw `OVERVIEW_RANGES.includes is not a function` on the
 * first real request. Found by running the real `next build` output, not by any unit test — every
 * test here imports the module directly, where it is an ordinary array.
 *
 * The check is deliberately against the KEY vocabulary, never against the translated labels
 * (ADR 0017): a `?range=7d` link must parse identically for every reader, whatever language the
 * report comes out in.
 */
export function parseRange(raw: string | null): OverviewRange {
  return isOverviewRange(raw) ? raw : 'mtd';
}

export interface ResolvePageReportInput {
  /** The `path` query param, verbatim. */
  path: string | null;
  range: string | null;
  from: string | null;
  to: string | null;
  /** Reads any other query param by name — the page's own declared filters. */
  param: (name: string) => string | null;
  now: Date;
  /**
   * The `common` namespace bound to the REQUEST's locale (ADR 0017) — the report's range label is
   * copy, and a report is read by a person, so it comes out in their language. The route resolves
   * it with `getServerTranslation` before calling; there is no ambient default here on purpose,
   * because a Route Handler serves concurrent requests and a module-level locale would leak one
   * reader's language into another's document.
   */
  t: Translate;
  /** The `dashboards` namespace, same request, same locale — panel titles and subtitles are i18n
   *  keys in `dashboards.yaml` and are resolved here so the document carries finished copy. */
  tDashboards: Translate;
}

export function resolvePageReport(input: ResolvePageReportInput): PageReportResolution {
  const file = loadDashboards();
  const route = input.path ?? '';
  const page = findPage(file, route);
  if (!page) {
    return {
      ok: false,
      failure: {
        kind: 'unknown_route',
        route,
        known: file.pages.map((entry) => entry.route),
      },
    };
  }

  /**
   * A `scope: family` page is refused, LOUDLY, rather than exported as a document of unavailable
   * panels (C12, converse-frontends#455).
   *
   * That scope expands to one account-scoped query per account in the CALLER'S OWN account family,
   * and this route has no session to read that list from — it is a report renderer, not a signed-in
   * page. Resolving it here with an empty list would produce a syntactically valid report in which
   * every panel says "could not be loaded", which is a worse answer than a refusal: a person would
   * reasonably read it as "we have no usage", not as "this route cannot ask this question".
   *
   * The page that carries it (`/settings/overview/usage`) therefore renders no Export action at
   * all. This guard is the second half of that decision, so a hand-built URL gets the same answer
   * the UI gives.
   */
  if (page.panels.some((panel) => panel.query.scope === FAMILY_SCOPE)) {
    return {
      ok: false,
      failure: {
        kind: 'unexportable_route',
        route,
        message:
          `"${route}" fans out over the signed-in identity's own account family, which a report ` +
          'route cannot resolve — it has no session to read that list from. Export the ' +
          'per-account overview instead.',
      },
    };
  }

  const translatedPage = translateDashboardPage(page, input.tDashboards);
  const range = parseRange(input.range);
  const window = resolveOverviewWindow(range, input.from ?? '', input.to ?? '', input.now);

  // Only the filters the PAGE declares are read. A query param the page never declared cannot
  // reach a panel's query, which is the same containment `resolve-dashboard.ts` enforces from the
  // other side (an undeclared `$name` has nothing to substitute from and throws).
  const filters: Record<string, string | undefined> = {};
  for (const name of page.filters) {
    const value = input.param(name);
    if (value) filters[name] = value;
  }

  let resolved: ResolvedDashboard;
  try {
    resolved = resolveDashboard({ page: translatedPage, window, filters });
  } catch (error) {
    // The one thing that throws here is an unresolved `$param` — a caller that asked for an
    // actor page without naming the actor. That is a malformed REQUEST, not a server fault.
    return { ok: false, failure: { kind: 'invalid_filter', message: (error as Error).message } };
  }

  return {
    ok: true,
    page: translatedPage,
    resolved,
    context: {
      route,
      title: deriveReportTitle(route),
      rangeLabel: rangeLabels(input.t)[range],
      filters: page.filters
        .filter((name) => filters[name])
        .map((name) => ({ label: name, value: filters[name] as string })),
      slug: reportSlug(route, filters),
    },
  };
}

export interface AssemblePageReportInput {
  resolved: ResolvedDashboard;
  context: ReportContext;
  responses: (UsageQueryResponse | null)[];
  templateOrigin: string;
  includeTables: boolean;
  generatedAt: Date;
  /** The configured brand (`resolveReportBranding`), threaded through unchanged. */
  branding?: ReportBranding;
  /** The `reports` namespace and the BCP-47 tag for this request's locale (ADR 0017) — the
   *  document's column headers, delta wording and template labels. */
  t: Translate;
  locale: string;
}

/** The last step both `format=pdf` and `format=html` share: the resolved dashboard plus its
 *  responses become `data.json` and the chart assets. `format=csv` uses the same document and
 *  never touches Typst. */
export function assemblePageReport(input: AssemblePageReportInput): BuiltReport {
  return buildReport({
    resolved: input.resolved,
    responses: input.responses,
    title: input.context.title,
    rangeLabel: input.context.rangeLabel,
    filters: input.context.filters,
    template: { route: input.context.route, origin: input.templateOrigin },
    includeTables: input.includeTables,
    generatedAt: input.generatedAt,
    branding: input.branding,
    t: input.t,
    locale: input.locale,
  });
}
