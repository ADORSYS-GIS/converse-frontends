import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { findPage, parseDashboardsFile } from './dashboard-spec';
import type { DashboardPageSpec } from './dashboard-spec';
import { resolveDashboard } from './resolve-dashboard';
import { englishT } from '../test/english-t';
import { translateDashboardPage } from './page-entry';

/**
 * ADR 0017: `dashboards.yaml` carries i18n KEYS for `title`/`subtitle`/`rowLabel`/`unit`, and the
 * engine resolves them per request. These assertions are about the COPY a reader sees, so they run
 * the same resolver the server does, bound to English — which makes each of them a check on two
 * things at once: that the panel still says what it used to say, and that its key still exists in
 * `locales/en/dashboards.json`.
 */
const T = englishT('dashboards');

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
  return translateDashboardPage(page, T);
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
      // The three RINGS the owner asked for on 2026-09-03 — one `[azp]` grouping, three readings.
      'account-cost-by-channel',
      'account-tokens-by-channel',
      'account-requests-by-channel',
      // The FOURTH ring (owner correction, same day): the ring beside the channel three was meant
      // to be "Cost by PROJECT". It reads the `[project_id, model]` grouping the breakdowns above
      // already fire, so it cost no request at all.
      'account-cost-by-project',
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

  it('resolves twelve panels to five requests, one of them the comparison twin', () => {
    const page = pageFor(ACCOUNT_ROUTE);
    const resolved = resolveDashboard({
      page,
      window: WINDOW,
      filters: { accountId: 'acct_1' },
    });

    expect(page.panels).toHaveLength(12);
    // The hand-written page fired four (total, previous, share, by-model) for three boards. The
    // fourth ring added on 2026-09-03 did not move this number: it reads a dimension of a grouping
    // the page was already firing.
    expect(resolved.queries).toHaveLength(5);

    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;

    // The two stats and the chart share the one ungrouped request…
    expect(indexOf('spend-total')).toBe(indexOf('request-total'));
    expect(indexOf('spend-total')).toBe(indexOf('spend-over-time'));

    // …and the FIVE `[project_id, model]` panels share a second, each reading its own dimension.
    // `account-cost-by-project` is in this set deliberately: the ranked "Spend by project" and the
    // "Cost by project" ring are one reading in two shapes, and two requests would each meet the
    // 2,000-row limit at a different point — a truncated ring beside an untruncated list is two
    // disagreeing answers to one question on one page.
    const grouped = [
      'spend-by-project',
      'model-share',
      'spend-by-model',
      'latency-by-model',
      'account-cost-by-project',
    ].map(indexOf);
    expect(new Set(grouped).size).toBe(1);

    // The API-key grouping is deliberately its own request — crossing it with the two dimensions
    // above would multiply the row count past the limit on any account with real key usage.
    expect(indexOf('spend-by-api-key')).not.toBe(grouped[0]);

    // The three channel rings (owner request, 2026-09-03) are ONE `[azp]` request between them —
    // three readings of the same grouping, not three round trips. A ring that fired its own query
    // would triple this page's channel cost for nothing.
    const rings = [
      'account-cost-by-channel',
      'account-tokens-by-channel',
      'account-requests-by-channel',
    ].map(indexOf);
    expect(new Set(rings).size).toBe(1);
    expect(rings[0]).not.toBe(grouped[0]);
    expect(rings[0]).not.toBe(indexOf('spend-by-api-key'));
  });

  /**
   * The rings are rings, they read the three columns the owner asked for, and they open NOTHING.
   * `/admin/usage/channels/<azp>` — the one route a channel row could link to — is gated on
   * `usage:read-all`, which this page's readers do not hold, so a linked segment would be a 404
   * dressed up as a drill-down.
   */
  it('gives the three channel panels one metric each, grouped by azp, linking nowhere', () => {
    const page = pageFor(ACCOUNT_ROUTE);
    const ringOf = (id: string) => page.panels.find((panel) => panel.id === id);

    expect(ringOf('account-cost-by-channel')?.metric).toBe('cost');
    expect(ringOf('account-tokens-by-channel')?.metric).toBe('tokens');
    expect(ringOf('account-requests-by-channel')?.metric).toBe('requests');

    for (const id of [
      'account-cost-by-channel',
      'account-tokens-by-channel',
      'account-requests-by-channel',
    ]) {
      const ring = ringOf(id);
      expect(ring?.type, id).toBe('donut');
      expect(ring?.span, id).toBe(1);
      expect(ring?.query.group_by, id).toEqual(['azp']);
      expect(ring?.options?.link, id).toBeUndefined();
      // The subtitle has to name `azp` for what it is — a raw OAuth client id printed verbatim.
      expect(ring?.subtitle, id).toMatch(/oauth client \(azp\)/i);
    }
  });

  /**
   * The FOURTH ring (owner correction, 2026-09-03: the ring meant beside the channel three was
   * "Cost by PROJECT"). Unlike `azp`, `project_id` IS an actor dimension, so its segments carry
   * project NAMES — the page's own project labels first, `resolveActorLabels` second.
   */
  it('gives the fourth ring the project dimension, off the grouping the page already fires', () => {
    const ring = pageFor(ACCOUNT_ROUTE).panels.find((p) => p.id === 'account-cost-by-project');
    expect(ring?.type).toBe('donut');
    expect(ring?.span).toBe(1);
    expect(ring?.metric).toBe('cost');
    expect(ring?.options?.dimension).toBe('project_id');
    // NOT its own `[project_id]` query — the grouping the four breakdown panels already share.
    expect(ring?.query.group_by).toEqual(['project_id', 'model']);
    // Segments open nothing: the only thing a project segment could lead to is this same page with
    // `?project=` set, which is the picker already in the header.
    expect(ring?.options?.link).toBeUndefined();
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
    // The BUDGET card above the grid is the budget period; this one is the range picker. Two
    // spend numbers on one page have to say which is which.
    expect(total?.subtitle).toMatch(/budget period/i);
  });
});

describe('/settings/overview/usage (the account-family fan-out) in dashboards.yaml', () => {
  it('declares the account page’s whole panel set, plus the panels only a family can draw', () => {
    expect(pageFor(FAMILY_ROUTE).panels.map((panel) => panel.id)).toEqual([
      // Requests / Cost were the estate screen's own cards; Cost-per-request and the honest
      // "accounts WITH USAGE" count are the two stats only a family can ask for.
      'family-requests',
      'family-cost',
      'family-cost-per-request',
      'family-accounts',
      'family-spend',
      // Family-only: one line per ACCOUNT, off the same request as the total above.
      'spend-by-account',
      // From here down, the account page's own reading order, resolved across the family
      // (owner directive, 2026-09-03: "the same amount of dashboards as /accounts/:id/overview
      // but cross accounts").
      'family-spend-by-project',
      'family-model-share',
      'family-spend-by-model',
      'family-latency-by-model',
      'family-spend-by-api-key',
      'family-cost-by-channel',
      'family-tokens-by-channel',
      'family-requests-by-channel',
      'family-cost-by-project',
      // The fifth ring, and the one `/accounts/<id>/overview` structurally cannot draw: a
      // single-account page has exactly one `account_id`, so its ring would be a full circle.
      'family-cost-by-account',
    ]);
  });

  /**
   * The parity claim itself, asserted against the account page rather than against a list a reader
   * has to diff by eye. Every panel the account page draws has a family counterpart of the SAME
   * type, metric and dimension — the ids differ (`family-` prefix) because a panel id is a URL
   * knob (`?<panel-id>-scale=`) and the two pages are two documents' worth of them.
   */
  it('mirrors every account-page panel, by type, metric and dimension', () => {
    const account = pageFor(ACCOUNT_ROUTE);
    const family = pageFor(FAMILY_ROUTE);
    const byId = (page: DashboardPageSpec, id: string) => page.panels.find((p) => p.id === id);

    const COUNTERPART: Record<string, string> = {
      'spend-total': 'family-cost',
      'request-total': 'family-requests',
      'spend-over-time': 'family-spend',
      'spend-by-project': 'family-spend-by-project',
      'model-share': 'family-model-share',
      'spend-by-model': 'family-spend-by-model',
      'latency-by-model': 'family-latency-by-model',
      'spend-by-api-key': 'family-spend-by-api-key',
      'account-cost-by-channel': 'family-cost-by-channel',
      'account-tokens-by-channel': 'family-tokens-by-channel',
      'account-requests-by-channel': 'family-requests-by-channel',
      'account-cost-by-project': 'family-cost-by-project',
    };
    // Every panel on the account page is accounted for — a panel added there without a family
    // twin fails HERE rather than quietly leaving the two pages out of parity again.
    expect(Object.keys(COUNTERPART).sort()).toEqual(account.panels.map((p) => p.id).sort());

    for (const [accountId, familyId] of Object.entries(COUNTERPART)) {
      const here = byId(account, accountId);
      const there = byId(family, familyId);
      expect(there, familyId).toBeDefined();
      expect(there?.type, familyId).toBe(here?.type);
      expect(there?.metric, familyId).toBe(here?.metric);
      expect(there?.span, familyId).toBe(here?.span);
      expect(there?.compare ?? false, familyId).toBe(here?.compare ?? false);
      // The account page's ungrouped panels become `dimension: none` readings of the family's
      // `[account_id]` fan-out — the same sum, without a second fan-out of N more requests.
      const dimensionHere = here?.options?.dimension ?? here?.query.group_by?.[0];
      const dimensionThere = there?.options?.dimension ?? there?.query.group_by?.[0];
      expect(dimensionThere === 'none' ? undefined : dimensionThere, familyId).toBe(
        dimensionHere === undefined ? undefined : dimensionHere
      );
    }
  });

  /** The dimension only this page has rows for, and the reason it is a page at all. */
  it('adds the account-dimension ring the single-account page cannot have', () => {
    const ring = pageFor(FAMILY_ROUTE).panels.find((p) => p.id === 'family-cost-by-account');
    expect(ring?.type).toBe('donut');
    expect(ring?.metric).toBe('cost');
    expect(ring?.options?.dimension).toBe('account_id');
    expect(ring?.query.group_by).toEqual(['account_id']);
    expect(pageFor(ACCOUNT_ROUTE).panels.some((p) => p.options?.dimension === 'account_id')).toBe(
      false
    );
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

  /**
   * **The page's request count, stated as the product it actually is: FAN-OUT × DISTINCT
   * GROUPINGS.**
   *
   * Under `scope: family` a page's cost is not "one request per panel" and not "one request" — it
   * is one request per (account × query shape). Sixteen panels resolve to FIVE shapes, the same
   * five `/accounts/<id>/overview` fires:
   *
   *   `[account_id]` · its comparison twin · `[project_id, model]` · `[api_key_id]` · `[azp]`
   *
   * so the page is `5 × N`, N = `min(family accounts, MAX_FANNED_OUT_ACCOUNTS = 25)` ⇒ at most
   * 125 requests. `options.dimension` is the entire reason it is five and not sixteen: eleven of
   * the sixteen panels read a dimension of a grouping another panel already asked for.
   */
  it('expands into five query shapes per family account — the fan-out × the groupings', () => {
    const accounts = ['acct_1', 'acct_2', 'acct_3'];
    const page = pageFor(FAMILY_ROUTE);
    const resolved = resolveDashboard({ page, window: WINDOW, familyAccountIds: accounts });

    const SHAPES = 5;
    expect(page.panels).toHaveLength(16);
    expect(resolved.queries).toHaveLength(accounts.length * SHAPES);
    expect(resolved.queries.filter((q) => q.scope === 'account')).toHaveLength(
      accounts.length * SHAPES
    );
    expect(resolved.queries.some((q) => q.scope === 'family')).toBe(false);

    // The distinct GROUPINGS in the current window — four, one of which the twin repeats.
    const current = resolved.queries.filter((q) => q.start_time === WINDOW.start.toISOString());
    expect(current).toHaveLength(accounts.length * 4);
    expect(new Set(current.map((q) => (q.group_by ?? []).join(',')))).toEqual(
      new Set(['account_id', 'project_id,model', 'api_key_id', 'azp'])
    );
    // Every account is asked every question — a family total that skipped an account would be a
    // wrong number, not a partial one.
    for (const groupBy of ['account_id', 'project_id,model', 'api_key_id', 'azp']) {
      const shape = current.filter((q) => (q.group_by ?? []).join(',') === groupBy);
      expect(
        shape.map((q) => q.scope_id),
        groupBy
      ).toEqual(accounts);
    }

    // The comparison twin is fired for ONE shape only — the `[account_id]` one the two comparing
    // stats and the total chart share. A twin per shape would have made the page `8 × N`.
    const previous = resolved.queries.filter((q) => q.start_time !== WINDOW.start.toISOString());
    expect(previous).toHaveLength(accounts.length);
    expect(previous.every((q) => (q.group_by ?? []).join(',') === 'account_id')).toBe(true);
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
  it('serves the family total, the by-account board and the account ring off ONE grouping', () => {
    const page = pageFor(FAMILY_ROUTE);
    const dimensionOf = (id: string) =>
      page.panels.find((panel) => panel.id === id)?.options?.dimension;
    expect(dimensionOf('family-spend')).toBe('none');
    expect(dimensionOf('spend-by-account')).toBe('account_id');
    expect(dimensionOf('family-cost-by-account')).toBe('account_id');
    expect(dimensionOf('family-model-share')).toBe('model');

    // Four groupings for sixteen panels, and EVERY panel declares which dimension it reads —
    // relying on `group_by[0]` would make a panel's cost invisible in its own YAML, which is the
    // one thing a fan-out page cannot afford.
    const groupings = new Set(page.panels.map((panel) => (panel.query.group_by ?? []).join(',')));
    expect(groupings).toEqual(new Set(['account_id', 'project_id,model', 'api_key_id', 'azp']));
    for (const panel of page.panels) {
      // The three channel rings are the exception the account page also makes: a single-dimension
      // `[azp]` grouping read by its own `group_by[0]` needs no restatement.
      if ((panel.query.group_by ?? []).join(',') === 'azp') continue;
      expect(panel.options?.dimension, panel.id).toBeDefined();
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
