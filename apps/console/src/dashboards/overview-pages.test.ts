import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { findPage, parseDashboardsFile } from './dashboard-spec';
import type { DashboardPageSpec } from './dashboard-spec';
import { resolveDashboard } from './resolve-dashboard';

/**
 * The five page entries C12 (converse-frontends#455) migrated, asserted against what the
 * hand-written screens they replaced actually drew.
 *
 * This is the PARITY oracle on the DATA side; the Storybook page stories are the one on the visual
 * side. It exists because "the boards became panels" is a claim that rots silently: a panel dropped
 * from the document, a scope quietly widened from one account to the estate, an honesty caption
 * deleted along with the container that rendered it — none of those breaks a type or a render, and
 * every one is a regression a person would only notice by missing a number they used to have.
 *
 * The three claims it is most concerned with, in order of how badly a regression would hurt:
 *  1. **No panel queries wider than its page.** An account page that resolved to `scope: all`
 *     would show one customer another's spend. Every panel's scope is checked, per page.
 *  2. **The fan-out is a fan-out.** `/settings/overview/usage` must expand to one query per family
 *     account, not one estate-wide query — see `FAMILY_SCOPE`'s own doc comment for why the two
 *     are different questions with different authorization.
 *  3. **Request counts did not grow.** Each migration is supposed to have made the page cheaper,
 *     and the numbers below are what makes that checkable rather than asserted in a comment.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');

function pageFor(route: string): DashboardPageSpec {
  const file = parseDashboardsFile(
    parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')),
    REPO_DASHBOARDS
  );
  const page = findPage(file, route);
  if (!page) throw new Error(`dashboards.yaml has no "${route}" entry`);
  return page;
}

/** A 28-day window — long enough that the one-week comparison floor never widens it, so the
 *  assertions are about the SPEC rather than about calendar arithmetic. */
const WINDOW = {
  start: new Date('2026-08-01T00:00:00.000Z'),
  end: new Date('2026-08-29T00:00:00.000Z'),
};

const ACCOUNT_ROUTE = '/accounts/[accountId]/overview';
const FAMILY_ROUTE = '/settings/overview/usage';
const LENS_ROUTES = [
  '/settings/overview/account',
  '/settings/overview/project',
  '/settings/overview/user',
] as const;

describe('/accounts/[accountId]/overview in dashboards.yaml', () => {
  it('declares every board the hand-written page drew, plus the three the ?group-by= knob hid', () => {
    expect(pageFor(ACCOUNT_ROUTE).panels.map((panel) => panel.id)).toEqual([
      // The money-first pair, both comparing against the previous window (D-F).
      'spend-total',
      'request-total',
      // SPEND OVER TIME — the account TOTAL, with the dashed previous period.
      'spend-over-time',
      // The four breakdowns. Three of them (`spend-by-project`, `model-share`, `spend-by-api-key`)
      // were ONE share bar whose dimension changed under `?group-by=`; they are all visible now.
      'spend-by-project',
      'model-share',
      'spend-by-model',
      'latency-by-model',
      'spend-by-api-key',
    ]);
  });

  it('owns the account segment and the project scope, and nothing else', () => {
    expect(pageFor(ACCOUNT_ROUTE).filters).toEqual(['accountId', 'project']);
  });

  /** The one that would leak another customer's data if it regressed. */
  it('scopes every panel to the routed account, never to the estate', () => {
    for (const panel of pageFor(ACCOUNT_ROUTE).panels) {
      expect(panel.query.scope, panel.id).toBe('account');
      expect(panel.query.scope_id, panel.id).toBe('$accountId');
    }
  });

  /**
   * The project scope's neutral position is "All projects", so the filter has to DISAPPEAR rather
   * than be sent empty — `filters.project_id: ''` matches nothing, which would draw an empty
   * dashboard for the default state of the page.
   */
  it('reads the project scope through the OPTIONAL placeholder, on every panel', () => {
    for (const panel of pageFor(ACCOUNT_ROUTE).panels) {
      expect(panel.query.filters?.project_id, panel.id).toBe('$project?');
    }
  });

  it('resolves eight panels to four requests, one of them the comparison twin', () => {
    const page = pageFor(ACCOUNT_ROUTE);
    const resolved = resolveDashboard({
      page,
      window: WINDOW,
      filters: { accountId: 'acct_1' },
    });

    expect(page.panels).toHaveLength(8);
    // The hand-written page fired four (total, previous, share, by-model) for three boards.
    expect(resolved.queries).toHaveLength(4);

    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;

    // The two stats and the chart share the one ungrouped request…
    expect(indexOf('spend-total')).toBe(indexOf('request-total'));
    expect(indexOf('spend-total')).toBe(indexOf('spend-over-time'));

    // …and the four `[project_id, model]` panels share a second, each reading its own dimension.
    const grouped = ['spend-by-project', 'model-share', 'spend-by-model', 'latency-by-model'].map(
      indexOf
    );
    expect(new Set(grouped).size).toBe(1);

    // The API-key grouping is deliberately its own request — crossing it with the two dimensions
    // above would multiply the row count past the limit on any account with real key usage.
    expect(indexOf('spend-by-api-key')).not.toBe(grouped[0]);
  });

  it('drops the project filter entirely when the scope is on All projects', () => {
    const resolved = resolveDashboard({
      page: pageFor(ACCOUNT_ROUTE),
      window: WINDOW,
      filters: { accountId: 'acct_1' },
    });
    for (const query of resolved.queries) {
      expect(query.filters).toBeUndefined();
    }
  });

  it('sends the project filter on every panel once a project is scoped', () => {
    const resolved = resolveDashboard({
      page: pageFor(ACCOUNT_ROUTE),
      window: WINDOW,
      filters: { accountId: 'acct_1', project: 'proj_7' },
    });
    for (const query of resolved.queries) {
      expect(query.filters).toEqual({ project_id: 'proj_7' });
    }
  });

  it('carries the latency caption its predecessor did not have to make', () => {
    const latency = pageFor(ACCOUNT_ROUTE).panels.find((p) => p.id === 'latency-by-model');
    expect(latency?.subtitle).toMatch(/per bucket/i);
    expect(latency?.subtitle).toMatch(/never an average of percentiles/i);
  });

  it('says the two spend figures on this page are over different windows', () => {
    const total = pageFor(ACCOUNT_ROUTE).panels.find((p) => p.id === 'spend-total');
    // The BUDGET card above the grid is the billing period; this one is the range picker. Two
    // spend numbers on one page have to say which is which.
    expect(total?.subtitle).toMatch(/billing period/i);
  });
});

describe('/settings/overview/usage (the account-family fan-out) in dashboards.yaml', () => {
  it('declares the estate screen’s boards plus the stat row it did not have', () => {
    expect(pageFor(FAMILY_ROUTE).panels.map((panel) => panel.id)).toEqual([
      // Requests / Cost were the estate screen's own cards; Cost-per-request and the honest
      // "accounts WITH USAGE" count are new, and both come free off the one fan-out below.
      'family-requests',
      'family-cost',
      'family-cost-per-request',
      'family-accounts',
      'family-spend',
      'spend-by-account',
      'family-model-share',
    ]);
  });

  /**
   * The authorization claim. `scope: all` is the whole deployment and needs `usage:read-all`;
   * this page is the signed-in identity's own accounts. Widening it would turn a page every user
   * can open into one that 403s for most of them — or, worse on a permissive deployment, one that
   * shows them the estate.
   */
  it('uses the family scope on every panel, never the estate scope', () => {
    for (const panel of pageFor(FAMILY_ROUTE).panels) {
      expect(panel.query.scope, panel.id).toBe('family');
      expect(panel.query.scope_id, panel.id).toBeUndefined();
    }
  });

  it('expands into one account-scoped query per family account, plus the comparison twin', () => {
    const accounts = ['acct_1', 'acct_2', 'acct_3'];
    const resolved = resolveDashboard({
      page: pageFor(FAMILY_ROUTE),
      window: WINDOW,
      familyAccountIds: accounts,
    });

    // Six panels, ONE fan-out (six panels share one query shape) plus its twin.
    expect(resolved.queries).toHaveLength(accounts.length * 2);
    expect(resolved.queries.filter((q) => q.scope === 'account')).toHaveLength(accounts.length * 2);
    expect(resolved.queries.some((q) => q.scope === 'family')).toBe(false);

    const current = resolved.queries.filter((q) => q.start_time === WINDOW.start.toISOString());
    expect(current.map((q) => q.scope_id)).toEqual(accounts);
  });

  it('gives every panel the whole fan-out, so a family total is never a partial sum', () => {
    const accounts = ['acct_1', 'acct_2'];
    const resolved = resolveDashboard({
      page: pageFor(FAMILY_ROUTE),
      window: WINDOW,
      familyAccountIds: accounts,
    });
    for (const panel of resolved.panels) {
      expect(panel.queryIndices, panel.spec.id).toHaveLength(accounts.length);
    }
  });

  /** A session whose account family has not loaded yet is a real, transient state — it must read
   *  as an empty dashboard, not as a crash or a permanently-pending page. */
  it('resolves to no queries at all rather than throwing when the family is empty', () => {
    const resolved = resolveDashboard({ page: pageFor(FAMILY_ROUTE), window: WINDOW });
    expect(resolved.queries).toHaveLength(0);
    for (const panel of resolved.panels) {
      expect(panel.queryIndices).toEqual([]);
    }
  });

  /**
   * The whole reason `options.dimension` exists. Under a fan-out each distinct query SHAPE costs N
   * requests, so the family total, the by-account board and the model share all read one grouped
   * query — `none`, `account_id` and `model` respectively.
   */
  it('serves the family total, the by-account board and the model share off ONE grouping', () => {
    const page = pageFor(FAMILY_ROUTE);
    const dimensionOf = (id: string) =>
      page.panels.find((panel) => panel.id === id)?.options?.dimension;
    expect(dimensionOf('family-spend')).toBe('none');
    expect(dimensionOf('spend-by-account')).toBe('account_id');
    expect(dimensionOf('family-model-share')).toBe('model');
    for (const panel of page.panels) {
      expect(panel.query.group_by, panel.id).toEqual(['account_id', 'model']);
    }
  });
});

describe('the three /settings/overview lenses in dashboards.yaml', () => {
  const scopeOf = { account: 'account', project: 'project', user: 'user' } as const;
  const placeholderOf = {
    '/settings/overview/account': '$accountId',
    '/settings/overview/project': '$projectId',
    '/settings/overview/user': '$sub',
  } as const;

  it.each(LENS_ROUTES)('%s scopes every panel to its own lens subject', (route) => {
    const lens = route.split('/').at(-1) as keyof typeof scopeOf;
    for (const panel of pageFor(route).panels) {
      expect(panel.query.scope, panel.id).toBe(scopeOf[lens]);
      expect(panel.query.scope_id, panel.id).toBe(placeholderOf[route]);
    }
  });

  it.each(LENS_ROUTES)('%s keeps the stat row the hand-written lens rendered', (route) => {
    const ids = pageFor(route).panels.map((panel) => panel.id);
    // Requests / Cost / Cost-per-request were the three cards `lensTotals` produced; "Models in
    // use" is the fourth, added because it comes free off the grouped query the lens already
    // fires and because three half-width cards leave a ragged row.
    expect(ids.slice(0, 4)).toEqual(['requests', 'cost', 'cost-per-request', 'models-in-use']);
  });

  it.each(LENS_ROUTES)('%s resolves its panels to three requests', (route) => {
    const resolved = resolveDashboard({
      page: pageFor(route),
      window: WINDOW,
      filters: { accountId: 'acct_1', projectId: 'proj_1', sub: 'usr_1' },
    });
    // The hand-written lens fired FOUR (day, model-day, model-totals, secondary) for the same
    // zones and had no "vs previous" reading at all. This is one ungrouped query, its comparison
    // twin (which the lens genuinely did not fetch before), and one grouping that four panels
    // share by each reading its own dimension.
    expect(resolved.queries).toHaveLength(3);
    const twins = resolved.panels.filter((panel) => panel.compareQueryIndices);
    expect(twins.map((panel) => panel.spec.id)).toEqual(['cost']);
  });

  it('gives the account lens a by-project breakdown and the project lens a by-key one', () => {
    const account = pageFor('/settings/overview/account').panels.map((p) => p.id);
    const project = pageFor('/settings/overview/project').panels.map((p) => p.id);
    const user = pageFor('/settings/overview/user').panels.map((p) => p.id);

    expect(account).toContain('spend-by-project');
    expect(project).toContain('spend-by-api-key');
    // The user lens has no secondary breakdown at all — a single identity's usage has no natural
    // sub-dimension beyond the model, which is what `SECONDARY_GROUP_BY.user === undefined` said.
    expect(user).not.toContain('spend-by-project');
    expect(user).not.toContain('spend-by-api-key');
  });

  it.each(LENS_ROUTES)('%s states that cost-per-request is blank without requests', (route) => {
    const stat = pageFor(route).panels.find((panel) => panel.id === 'cost-per-request');
    expect(stat?.metric).toBe('derived:costPerRequest');
    expect(stat?.subtitle).toMatch(/no requests/i);
  });
});

describe('no page entry queries wider than the page it describes', () => {
  it.each([ACCOUNT_ROUTE, ...LENS_ROUTES, FAMILY_ROUTE])('%s', (route) => {
    for (const panel of pageFor(route).panels) {
      expect(panel.query.scope, `${route} / ${panel.id}`).not.toBe('all');
    }
  });
});
