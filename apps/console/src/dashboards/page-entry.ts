import { findPage, type DashboardPageSpec } from './dashboard-spec';
import { loadDashboards } from './load-dashboards';

/**
 * A route's own `dashboards.yaml` entry, or a LOUD failure (converse-frontends#455, story C12).
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
export function dashboardPage(route: string): DashboardPageSpec {
  const page = findPage(loadDashboards(), route);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${route}". The page is defined entirely by ` +
        'that entry, so there is nothing to render — fix the document (or the override mounted ' +
        'at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }
  return page;
}
