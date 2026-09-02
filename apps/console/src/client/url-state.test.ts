import { createSerializer } from 'nuqs';
import { isParserBijective } from 'nuqs/testing';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_SORT_KEYS,
  API_KEY_STATUSES,
  CURRENT_PERIOD,
  MANAGE_BUDGET_STATES,
  MANAGE_STATUSES,
  OVERVIEW_GROUP_BYS,
  OVERVIEW_RANGES,
  RESOLVER_TARGETS,
  URL_PARAM_CONTRACT,
  adminParsers,
  adminRefillPoliciesParsers,
  apiKeysParsers,
  createProjectParsers,
  dashboardScaleKey,
  manageParsers,
  overviewParsers,
  projectScopeParsers,
  resolverParsers,
  settingsOverviewParsers,
  settingsParsers,
} from './url-state';

/**
 * The URL param contract's own test (ADR 0011: "URLs become part of the product surface: param
 * names are a contract; renames need the same care as API fields").
 *
 * Three properties, in the order they matter:
 *
 *  1. **The names are pinned.** The table below is written out by hand on purpose — it is the
 *     second opinion. A rename in `url-state.ts` that nobody meant to make fails here rather than
 *     silently breaking every bookmark that carried the old name.
 *  2. **Defaults stay out of the URL.** Serializing a screen's default state must produce an empty
 *     query string, and changing one knob must produce a query string carrying exactly that knob.
 *  3. **Every parser round-trips.** Whatever the app writes, a reload must parse back to the same
 *     value — otherwise a shared link restores a *different* view from the one that was shared.
 */

describe('the URL param contract', () => {
  it('pins every param name, per route', () => {
    const names = Object.fromEntries(
      Object.entries(URL_PARAM_CONTRACT).map(([route, { parsers, urlKeys }]) => [
        route,
        Object.keys(parsers)
          .map((key) => (urlKeys as Record<string, string | undefined>)[key] ?? key)
          .sort(),
      ])
    );

    expect(names).toEqual({
      // IA v3 phase 1 ("account into the path"): the account half of scope is now a path segment
      // (`/accounts/[accountId]/*`, `client/use-account-id.ts`), not a URL param — only the
      // project half remains one.
      projectScope: ['project'],
      // `/`'s account resolver (`app/(console)/page.tsx`) — which of the three account-scoped
      // screens to land on once an account id is resolved.
      resolver: ['next'],
      // ADR-0026: "+ New account" opens from the workspace switcher (chrome, every route) AND
      // `/settings/account`'s own `PageHeader` — the one dialog instance both trigger, so its
      // open flag is shared rather than owned by either route.
      createAccount: ['new-account'],
      // Rail-return round (2026-08-30, owner: "I create account in settings or in a raw
      // dropdown, but project only in projects?"): the SAME shape `createAccount` above already
      // solved — `/projects`, `/settings/projects` and the inspector rail's quick-settings row
      // all have to open the one instance mounted in the layout.
      createProject: ['new-project'],
      // converse-frontends#453: the Export dialog on every `dashboards.yaml` page. Cross-route for
      // the same reason the two above are — the button belongs to the dashboard engine's page
      // shell, not to any one route, so there is ONE declaration rather than a `?report=`-shaped
      // flag per YAML page. `export-format`/`export-tables` are named apart from `manage`'s own
      // `format` because they configure a DIFFERENT document (a dashboard report, not the monthly
      // consumption one) and a page could in principle mount both.
      dashboardExport: ['export', 'export-format', 'export-tables'],
      // Phase 4: `/` absorbed the admin-only dashboard's own Export action, so it carries the
      // same report vocabulary `/manage` does, on top of its own dashboard knobs.
      overview: [
        'bucket',
        'format',
        'from',
        'group-by',
        'include',
        'model',
        'model-scale',
        'period',
        'range',
        'report',
        'report-group',
        'series',
        'to',
      ],
      apiKeys: ['create', 'delete', 'dir', 'key', 'page', 'q', 'revoke', 'sort', 'status'],
      manage: [
        'budget-state',
        'dir',
        'format',
        'include',
        'page',
        'period',
        'q',
        'report',
        'report-group',
        'row',
        'sort',
        'status',
      ],
      // `account-name` moved off `manage` with the panel that opens it: a core account mutation.
      // `q`/`page` (phase 6, admin/settings revamp): `/settings/projects`' own search + pager,
      // the unbounded N×7 project dump replaced by search + 10/page `Pagination`. `row`/`rename`
      // (phase 9, Addition C) split what used to be one `rename=<id>` param in two: `row` is the
      // project `DetailSheet` has open (a selection), `rename` is whether the rename dialog is
      // stacked on top of it — see `settingsParsers`' own doc comment.
      settings: ['account-name', 'page', 'q', 'rename', 'row'],
      // Phase 4: `/admin` is now ONE screen (the budget refill review queue) — its dashboard
      // section and every param it mirrored from `/` moved to `/` itself, gated by role. Phase 6
      // deletes the Pending/Decided `tab` param (the tab itself is gone) and adds the queue's own
      // sort (`sort`/`dir`) and page cursor (`after`).
      admin: ['after', 'dir', 'request', 'sort'],
      // `/admin/overview`'s own window, and nothing else. C4 (converse-frontends#447) moved the
      // six per-board axis knobs out of this static table: the page's boards are `dashboards.yaml`
      // entries now, so its series panels — and therefore its axis knobs — are DATA, declared per
      // panel id by `useDashboardScaleParams` (asserted below). `refill-decisions-scale` went with
      // them and would have anyway: it named a board that never existed, since no procedure lists
      // decided refill requests (lightbridge-authz#556).
      adminOverview: ['from', 'range', 'to'],
      // Owner review round 2 (2026-08-31, converse-frontends#368 finding #4): list at the bare
      // path, TWO mode params now (`edit`/`simulate` — `create` moved off this table to its own
      // route, `/admin/refill-policies/create`), plus the list mode's own lookup target
      // (`policy-set`) — there is no procedure that lists which policy sets exist, so "which one
      // am I looking at" has to be a URL param, not a component-local search box.
      adminRefillPolicies: ['edit', 'policy-set', 'simulate'],
      // IA v3 phase 4: the four `/settings/overview/*` analytics lenses (`usage`/`account`/
      // `project`/`user`) share this one range/selection vocabulary — no `bucket` (removed
      // 2026-08-31, owner round finding #5: every lens' spend chart is a fixed day bucket, so the
      // param parsed into nothing any request builder or control ever read). `account-scale` is
      // the estate overview's "Spend by account" axis toggle (`MultiSeriesSpendChart` wiring,
      // 2026-08-31) — it replaced `account-sort`, the by-account board's now-deleted ranked-row
      // sort toggle, which has no surface to render into once that board is a chart.
      settingsOverview: ['account-scale', 'from', 'range', 'series', 'to'],
    });
  });

  it('uses kebab-case on the wire everywhere it needs more than one word', () => {
    for (const { parsers, urlKeys } of Object.values(URL_PARAM_CONTRACT)) {
      for (const key of Object.keys(parsers)) {
        const urlKey = (urlKeys as Record<string, string | undefined>)[key] ?? key;
        expect(urlKey, `${urlKey} must be lower kebab-case`).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    }
  });

  it('gives the two routes that share a param name the same meaning for it', () => {
    // `page`, `q` and `status` appear on both ledgers. That is deliberate — one vocabulary across
    // the product — but it only holds if they keep parsing the same way.
    expect(apiKeysParsers.page.defaultValue).toBe(manageParsers.page.defaultValue);
    expect(apiKeysParsers.search.defaultValue).toBe(manageParsers.search.defaultValue);
    expect(apiKeysParsers.status.defaultValue).toBe(manageParsers.status.defaultValue);
    expect(URL_PARAM_CONTRACT.apiKeys.urlKeys.search).toBe(
      URL_PARAM_CONTRACT.manage.urlKeys.search
    );

    // `format`/`include`/`period` appear on both `/` and `/manage`'s report dialogs. They are the
    // SAME parser instances, not lookalikes — `?format=pdf` cannot come to mean one thing on one
    // screen's Export dialog and another on the other's.
    for (const key of ['format', 'include', 'period'] as const) {
      expect(overviewParsers[key], `overview.${key} must be manage.${key} itself`).toBe(
        manageParsers[key]
      );
    }

    // `range` appears on both the account overview (`overviewParsers`) and the four
    // `/settings/overview/*` analytics lenses (`settingsOverviewParsers`) — deliberately the SAME
    // vocabulary and default ('mtd', "this month") rather than a divergent range picker, even
    // though the two are declared as separate objects (each lens has no groupBy/report vocabulary
    // of its own to share) — see `settingsOverviewParsers`' own doc comment.
    expect(settingsOverviewParsers.range.defaultValue).toBe(overviewParsers.range.defaultValue);
  });

  describe('defaults stay out of the URL', () => {
    it.each(Object.entries(URL_PARAM_CONTRACT))('%s', (_route, { parsers, urlKeys }) => {
      const serialize = createSerializer(parsers, { urlKeys });
      const defaults = Object.fromEntries(
        Object.entries(parsers).map(([key, parser]) => [key, parser.defaultValue])
      );

      expect(serialize(defaults)).toBe('');
    });
  });

  it('writes only the param that actually changed', () => {
    const overview = createSerializer(overviewParsers, {
      urlKeys: URL_PARAM_CONTRACT.overview.urlKeys,
    });
    expect(overview({ range: '7d' })).toBe('?range=7d');
    expect(overview({ range: '30d' })).toBe('?range=30d');
    // 'mtd' ("this month") is the default (2026-08-31) — a bare shared link with no `?range=`
    // means "this month" for whoever opens it, not the old 30-day default.
    expect(overview({ range: 'mtd' })).toBe('');
    expect(overview({ groupBy: 'model' })).toBe('?group-by=model');

    const settings = createSerializer(settingsParsers, {
      urlKeys: URL_PARAM_CONTRACT.settings.urlKeys,
    });
    // The selected row and the rename dialog are two separate params now (phase 9, Addition C):
    // opening a project (a selection) does not imply starting to rename it.
    expect(settings({ renameProjectId: 'proj_7' })).toBe('?row=proj_7');
    expect(settings({ renameProjectId: '' })).toBe('');
    expect(settings({ renameProjectId: 'proj_7', projectNameOpen: true })).toBe(
      '?row=proj_7&rename=true'
    );
    expect(settings({ accountNameOpen: true })).toBe('?account-name=true');
    expect(settings({ search: 'gateway', page: 2 })).toBe('?q=gateway&page=2');

    const manage = createSerializer(manageParsers, { urlKeys: URL_PARAM_CONTRACT.manage.urlKeys });
    expect(manage({ search: 'alpha', budgetState: 'no-quota' })).toBe(
      '?q=alpha&budget-state=no-quota'
    );
    // The report's include set is a comma-separated array param, and its default clears itself.
    expect(manage({ include: ['totals'] })).toBe('');
    expect(manage({ include: ['totals', 'per-model'] })).toBe('?include=totals,per-model');
  });

  it('round-trips every parser', () => {
    expect(isParserBijective(projectScopeParsers.projectId, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(resolverParsers.next, 'api-keys', 'api-keys')).toBe(true);
    expect(isParserBijective(overviewParsers.range, '7d', '7d')).toBe(true);
    expect(isParserBijective(overviewParsers.bucket, 'hour', 'hour')).toBe(true);
    expect(isParserBijective(overviewParsers.groupBy, 'model', 'model')).toBe(true);
    expect(isParserBijective(overviewParsers.series, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(apiKeysParsers.page, '3', 3)).toBe(true);
    expect(isParserBijective(apiKeysParsers.status, 'revoked', 'revoked')).toBe(true);
    expect(isParserBijective(apiKeysParsers.search, 'alpha beta', 'alpha beta')).toBe(true);
    expect(isParserBijective(apiKeysParsers.createOpen, 'true', true)).toBe(true);
    expect(isParserBijective(manageParsers.budgetState, 'no-quota', 'no-quota')).toBe(true);
    expect(isParserBijective(manageParsers.reportOpen, 'true', true)).toBe(true);
    expect(isParserBijective(manageParsers.period, '2026-07', '2026-07')).toBe(true);
    expect(isParserBijective(manageParsers.format, 'pdf', 'pdf')).toBe(true);
    expect(
      isParserBijective(manageParsers.include, 'totals,per-model', ['totals', 'per-model'])
    ).toBe(true);
    expect(isParserBijective(settingsParsers.accountNameOpen, 'true', true)).toBe(true);
    expect(isParserBijective(settingsParsers.renameProjectId, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(settingsParsers.projectNameOpen, 'true', true)).toBe(true);
    expect(isParserBijective(settingsParsers.search, 'alpha', 'alpha')).toBe(true);
    expect(isParserBijective(settingsParsers.page, '3', 3)).toBe(true);
    expect(isParserBijective(adminParsers.sortKey, 'submitted', 'submitted')).toBe(true);
    expect(isParserBijective(adminParsers.sortDirection, 'desc', 'desc')).toBe(true);
    expect(isParserBijective(adminParsers.selectedRequestId, 'req_9', 'req_9')).toBe(true);
    expect(isParserBijective(adminParsers.after, 'cursor_1', 'cursor_1')).toBe(true);
    expect(
      isParserBijective(adminRefillPoliciesParsers.policySetId, 'budget-refill', 'budget-refill')
    ).toBe(true);
    expect(
      isParserBijective(
        adminRefillPoliciesParsers.editPolicySetId,
        'budget-refill',
        'budget-refill'
      )
    ).toBe(true);
    expect(
      isParserBijective(
        adminRefillPoliciesParsers.simulatePolicySetId,
        'budget-refill',
        'budget-refill'
      )
    ).toBe(true);
    // Overview's own Export dialog (phase 4) — same parsers as `/manage`'s, checked once here and
    // by instance-identity in the "shared meaning" test above.
    expect(isParserBijective(overviewParsers.reportOpen, 'true', true)).toBe(true);
    expect(isParserBijective(overviewParsers.period, '2026-07', '2026-07')).toBe(true);
    expect(isParserBijective(overviewParsers.format, 'pdf', 'pdf')).toBe(true);
    expect(isParserBijective(overviewParsers.modelScale, 'indexed', 'indexed')).toBe(true);
    expect(isParserBijective(createProjectParsers.open, 'true', true)).toBe(true);
    expect(isParserBijective(settingsOverviewParsers.range, '7d', '7d')).toBe(true);
    expect(isParserBijective(settingsOverviewParsers.series, 'acct_7', 'acct_7')).toBe(true);
    expect(isParserBijective(settingsOverviewParsers.accountScale, 'log', 'log')).toBe(true);
  });

  it('falls back to the default rather than crashing on a hand-edited or stale value', () => {
    // A URL is user-editable input and an old bookmark may carry a value the app has since
    // retired. A literal parser returns null for those, which nuqs resolves to the default.
    expect(overviewParsers.range.parse('42y')).toBeNull();
    expect(apiKeysParsers.status.parse('deleted')).toBeNull();
    expect(adminParsers.sortKey.parse('everything')).toBeNull();
    expect(manageParsers.page.parse('not-a-number')).toBeNull();
  });

  it('keeps every closed vocabulary in step with the type it claims to satisfy', () => {
    expect(OVERVIEW_RANGES).toEqual(['mtd', '7d', '30d', '90d']);
    // 'mtd' ("this month") is the default range — the budget resets monthly, so the dashboard's
    // default window matches the billing period (2026-08-31 owner directive).
    expect(overviewParsers.range.defaultValue).toBe('mtd');
    expect(API_KEY_STATUSES).toEqual(['all', 'active', 'revoked']);
    expect(MANAGE_STATUSES).toEqual(['all', 'active', 'suspended']);
    expect(MANAGE_BUDGET_STATES).toEqual(['all', 'quota-set', 'no-quota']);
    expect(ADMIN_SORT_KEYS).toEqual(['submitted']);
    expect(RESOLVER_TARGETS).toEqual(['overview', 'projects', 'api-keys']);
    // `console-ui#312`, closed: this is now a literal subset of `UsageGroupBy`
    // (`@lightbridge/api-rest`), asserted at the definition (`satisfies readonly UsageGroupBy[]`)
    // — no bridge table translates it any more (`overview-usage.ts`'s deleted
    // `OVERVIEW_GROUP_BY_TO_USAGE_GROUP_BY`).
    expect(OVERVIEW_GROUP_BYS).toEqual(['project_id', 'model', 'user_id', 'api_key_id']);
  });

  it('defaults the report period to the current month, resolved once', () => {
    expect(CURRENT_PERIOD).toMatch(/^\d{4}-\d{2}$/);
    expect(manageParsers.period.defaultValue).toBe(CURRENT_PERIOD);
    // Same parser instance as `/manage`'s (checked above) — so it carries the same default.
    expect(overviewParsers.period.defaultValue).toBe(CURRENT_PERIOD);
  });

  // A declarative dashboard page's axis knobs are not in `URL_PARAM_CONTRACT` because they are
  // derived from `dashboards.yaml`, not declared. What IS fixed is how a panel id becomes a param
  // name — kebab-case on the wire, like every other multi-word key above.
  it('derives a kebab-case scale param from a dashboard panel id', () => {
    expect(dashboardScaleKey('estate-spend')).toBe('estate-spend-scale');
    expect(dashboardScaleKey('adoption-over-time')).toBe('adoption-over-time-scale');
    expect(dashboardScaleKey('request-volume')).not.toMatch(/[A-Z_]/);
  });
});
