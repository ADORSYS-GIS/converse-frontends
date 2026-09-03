import { getServerTranslation } from '../i18n/server';
import type { Translate } from '../i18n/config';
import { findPage, type DashboardPageSpec } from './dashboard-spec';
import { loadDashboards } from './load-dashboards';

/**
 * A route's own `dashboards.yaml` entry, translated, or a LOUD failure
 * (converse-frontends#455 story C12; ADR 0017 for the translation half).
 *
 * `loadDashboards()` is `node:fs` and fail-loud by contract: an invalid document throws with the
 * offending page and panel id named rather than rendering an empty dashboard. A MISSING entry is
 * the same class of failure and deserves the same treatment — a page defined entirely by its entry
 * has nothing to render without one, and a blank grid is the exact silent failure externalizing
 * the dashboards exists to end.
 *
 * Extracted from `/admin/overview`'s route (which had it inline) once C12 made it six routes: six
 * copies of the same throw is six chances for one of them to be a `return null` instead.
 *
 * Server-only, like the loader it wraps. Every dashboard route is a Server Component that reads its
 * entry here and passes it to a client centre as a prop.
 */
export async function dashboardPage(route: string): Promise<DashboardPageSpec> {
  const page = findPage(loadDashboards(), route);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${route}". The page is defined entirely by ` +
        'that entry, so there is nothing to render — fix the document (or the override mounted ' +
        'at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }
  const { t } = await getServerTranslation(undefined, 'dashboards');
  return translateDashboardPage(page, t);
}

/**
 * A page entry whose copy fields are i18n KEYS -> the same entry with real, translated copy
 * (ADR 0017).
 *
 * **Why `dashboards.yaml` carries keys rather than English.** The document is the single
 * declaration of what a dashboard IS, and it is overridable per deployment
 * (`${CONSOLE_CONFIG_DIR}/dashboards.yaml`, owner ruling Q11). If it carried English prose, a
 * German session would either read English panel titles or need a parallel translated YAML — a
 * second document with the same 92 panels in it, which is the thing this file exists to prevent.
 * A key is the same size, is checked by the resource-parity test, and leaves the YAML's structure
 * — the part an operator actually overrides — unchanged.
 *
 * Resolution happens HERE, on the server, once per request, before the spec is handed to a client
 * centre: a panel's title travels as finished copy exactly like every other prop, so
 * `DashboardRenderer` and the report builder both stay ignorant of i18n. The same function is what
 * `/api/reports/page` calls, so an exported PDF is titled in the reader's own language.
 *
 * The translated fields are exactly the ones a human reads: `title`, `subtitle`, a table panel's
 * `options.rowLabel`/`options.unit` (the first column's header — "Account", "Channel" — and the
 * plural noun `Pagination` counts in), and `options.linkAllLabel` (the heading-slot affordance a
 * series board carries in place of the per-line links it cannot have). Everything else in the entry
 * is machine vocabulary: scopes, dimensions, limits, panel types, and the two ROUTES
 * (`options.link`/`options.linkAll`) — none of it is copy, and translating any of it would break
 * the query or the href.
 *
 * A key with no bundle entry resolves to the key itself, i18next's own behaviour, which prints
 * `admin-overview.estate-spend.title` on screen — ugly, obvious, and caught by
 * `i18n-resources.test.ts` before it can ship, which is the point: silent English fallback is what
 * would let a missing German title go unnoticed for a release.
 */
export function translateDashboardPage(page: DashboardPageSpec, t: Translate): DashboardPageSpec {
  return {
    ...page,
    panels: page.panels.map((panel) => ({
      ...panel,
      title: t(panel.title),
      ...(panel.subtitle === undefined ? {} : { subtitle: t(panel.subtitle) }),
      ...(panel.options === undefined
        ? {}
        : {
            options: {
              ...panel.options,
              ...(panel.options.rowLabel === undefined
                ? {}
                : { rowLabel: t(panel.options.rowLabel) }),
              ...(panel.options.unit === undefined ? {} : { unit: t(panel.options.unit) }),
              ...(panel.options.linkAllLabel === undefined
                ? {}
                : { linkAllLabel: t(panel.options.linkAllLabel) }),
            },
          }),
    })),
  };
}
