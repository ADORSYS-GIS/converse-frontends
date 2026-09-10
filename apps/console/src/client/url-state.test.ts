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
  adminBudgetSchedulesParsers,
  adminRefillPoliciesParsers,
  adminSessionsParsers,
  CONSOLE_DIALOGS,
  apiKeysParsers,
  dashboardExpandParsers,
  dashboardExportParsers,
  dialogParsers,
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
      // The owner's 2026-09-03 directive: EVERY modal in the console, on one param pair. The
      // per-dialog booleans this replaced (`new-account`, `new-project`, `export`, `create`,
      // `revoke`, `delete`, `account-name`, `rename`, `grant`, `preview`) are gone from the tables
      // below — `CONSOLE_DIALOGS` carries the name-for-name migration. It is cross-route by
      // construction, which is what the create-account/create-project dialogs needed anyway
      // (mounted once in the layout, opened from chrome AND from routed content).
      dialog: ['dialog', 'dialog-id'],
      // The expanded dashboard panel keeps a param of its OWN rather than a `dialog-id`, so that
      // the panel's existing `?<panel-id>-sort/-dir/-page/-scale` knobs steer the dialog's
      // contents unchanged — the directive's "pagination inside the modal" half.
      dashboardExpand: ['expand'],
      // converse-frontends#453: what the Export dialog PRODUCES. Whether it is open moved to
      // `?dialog=export` above; these two stayed, because they are the document's own inputs and
      // a link to an export in progress has to carry them. Named apart from `manage`'s own
      // `format` because they configure a DIFFERENT document (a dashboard report, not the monthly
      // consumption one) and a page could in principle mount both.
      dashboardExport: ['export-format', 'export-tables'],
      // The account dashboard's WINDOW, and nothing else. C12 (converse-frontends#455) moved this
      // page's boards into `dashboards.yaml`, which took `bucket` (the engine derives it from the
      // range), `group-by` (the four breakdowns it switched between are four panels now), `model`
      // (a single inert "All models" entry), `model-scale` (every series panel gets its own
      // `?<panel-id>-scale=`, declared from the spec) and `series` (no engine panel type wires a
      // selected key). Its export dialog's five params went with them: the page's action is
      // `DashboardExportButton`, whose knobs are the cross-route `dashboardExport` above. A knob
      // wired to nothing is a defect.
      overview: ['from', 'range', 'to'],
      // `key` is the row SELECTION (a persistent rail at `lg+`, per the layout contract — not a
      // modal). The screen's three dialogs moved to `?dialog=` on 2026-09-03.
      apiKeys: ['dir', 'key', 'page', 'q', 'sort', 'status'],
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
      // `q`/`page` (phase 6, admin/settings revamp): `/settings/projects`' own search + pager,
      // the unbounded N×7 project dump replaced by search + 10/page `Pagination`. `row` is the
      // project the detail surface has open — a SELECTION, which stays a param of its own; both
      // dialogs this table used to carry (`account-name`, `rename`) are `?dialog=` names now.
      settings: ['page', 'q', 'row'],
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
      // `/admin/usage`'s window plus its own lens (story C5). Pinned here from story C6 onward,
      // which is when the area grew three sibling routes that have to agree with it about what
      // `range`/`from`/`to` mean.
      adminUsage: ['from', 'lens', 'range', 'to'],
      // `/admin/usage/actors/[actorId]` (story C6) — the window plus the REQUIRED `?type=` naming
      // which of the three entities the path id is. It is the same three-valued vocabulary
      // `/admin/usage`'s lens writes into every actor row's href.
      adminUsageActor: ['from', 'range', 'to', 'type'],
      // `/admin/usage/channels/[channelId]` and `/admin/usage/chats` share one declaration: the
      // channel is a path segment and the chat filter is the YAML's, so neither owns a knob beyond
      // the window.
      adminUsageWindow: ['from', 'range', 'to'],
      // Owner review round 2 (2026-08-31, converse-frontends#368 finding #4): list at the bare
      // path, TWO mode params now (`edit`/`simulate` — `create` moved off this table to its own
      // route, `/admin/refill-policies/create`), plus the list mode's own lookup target
      // (`policy-set`) — there is no procedure that lists which policy sets exist, so "which one
      // am I looking at" has to be a URL param, not a component-local search box.
      adminRefillPolicies: ['edit', 'policy-set', 'simulate'],
      // Story C8 (converse-frontends#451): `edit` is a MODE — the page swaps its list for a form,
      // with no overlay to dismiss back to — so it stays here, meaning exactly what it means one
      // route over on `/admin/refill-policies`. The two real modals it used to carry (`preview`,
      // `delete`) are `?dialog=` names now.
      adminBudgetSchedules: ['edit'],
      // `/admin/sessions` (converse-frontends#450, story C7). `q` and `user` are deliberately two
      // params, not one: `q` is the text handed to `searchUsers`, `user` is the exact `subject`
      // (an account id — `sessions.subject` IS the owner's JWT `sub`, lightbridge-authz ADR-0006)
      // that `querySessions` is actually filtered by. A typed string can never be the filter, so
      // collapsing them would hide that a choice is being made. `after` is the opaque page cursor
      // `SessionPage.next` hands back — passed through verbatim, never constructed.
      // `limit` is the page size, in `querySessions`' own units (rows per call). It is a view
      // param, not a stored preference: two operators comparing the same page must see the same
      // page, and a `?limit=` in a pasted URL is what makes that true.
      adminSessions: ['after', 'kind', 'limit', 'q', 'selected', 'status', 'user'],
      // The four `/settings/overview/*` lenses (`usage`/`account`/`project`/`user`) share one
      // vocabulary, and every deletion from it has the same reason — a knob wired to nothing is a
      // defect: `bucket` went in 2026-08-31 (no request builder read it), `account-sort` with the
      // ranked-row list it sorted, and C12 (converse-frontends#455) took the last two when these
      // lenses became YAML pages: `account-scale` is the by-account PANEL's own
      // `?spend-by-account-scale=` now, declared from the spec, and `series` went with the
      // cross-zone selection no panel type reads.
      settingsOverview: ['from', 'range', 'to'],
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

    // `format`/`include`/`period` used to appear on BOTH the account overview's and `/manage`'s
    // report dialogs, as the same parser instances. C12 (converse-frontends#455) left `/manage` as
    // their only holder: the account dashboard exports through `DashboardExportButton` now, whose
    // knobs are the cross-route `dashboardExportParsers`. What the by-instance rule protected is
    // therefore now protected structurally — there is one declaration, not two.
    expect(Object.keys(URL_PARAM_CONTRACT.overview.parsers)).toEqual(['range', 'from', 'to']);

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
    // C12 (converse-frontends#455) deleted this table's dashboard knobs — the boards they
    // reshaped are `dashboards.yaml` panels now — so the export dialog's own grouping is what is
    // left with a kebab-cased url key.
    expect(overview({ from: '2026-08-01' })).toBe('?from=2026-08-01');

    const settings = createSerializer(settingsParsers, {
      urlKeys: URL_PARAM_CONTRACT.settings.urlKeys,
    });
    // The selected row and the rename dialog are two separate params now (phase 9, Addition C):
    // opening a project (a selection) does not imply starting to rename it.
    expect(settings({ renameProjectId: 'proj_7' })).toBe('?row=proj_7');
    expect(settings({ renameProjectId: '' })).toBe('');
    expect(settings({ search: 'gateway', page: 2 })).toBe('?q=gateway&page=2');

    // Every modal, on one param pair. A dialog with no target writes only `?dialog=`; one with a
    // target writes both, and closing clears both — a stale `?dialog-id=` can never outlive it.
    const dialog = createSerializer(dialogParsers, { urlKeys: URL_PARAM_CONTRACT.dialog.urlKeys });
    expect(dialog({ name: CONSOLE_DIALOGS.createProject })).toBe('?dialog=create-project');
    expect(dialog({ name: CONSOLE_DIALOGS.revokeApiKey, id: 'key_3' })).toBe(
      '?dialog=revoke-key&dialog-id=key_3'
    );
    expect(dialog({ name: '', id: '' })).toBe('');

    const expand = createSerializer(dashboardExpandParsers, {
      urlKeys: URL_PARAM_CONTRACT.dashboardExpand.urlKeys,
    });
    expect(expand({ panelId: 'actors-table' })).toBe('?expand=actors-table');

    const sessions = createSerializer(adminSessionsParsers, {
      urlKeys: URL_PARAM_CONTRACT.adminSessions.urlKeys,
    });
    // `active` is the landing filter — a bare `/admin/sessions` link means "the live ones" for
    // whoever opens it, the same default `querySessions` itself takes.
    expect(sessions({ status: 'active' })).toBe('');
    expect(sessions({ status: 'inactive' })).toBe('?status=inactive');
    expect(sessions({ kind: 'token' })).toBe('?kind=token');
    expect(sessions({ search: 'maria', subject: 'acc_1' })).toBe('?q=maria&user=acc_1');
    expect(sessions({ selectedSessionId: 'ses_9' })).toBe('?selected=ses_9');
    // 25 is `querySessions`' own default, so the landing URL stays clean; the other two are the
    // only values `?limit=` accepts, and 100 is that procedure's own clamp.
    expect(sessions({ limit: 25 })).toBe('');
    expect(sessions({ limit: 50 })).toBe('?limit=50');
    expect(sessions({ limit: 100 })).toBe('?limit=100');

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
    expect(isParserBijective(overviewParsers.from, '2026-08-01', '2026-08-01')).toBe(true);
    expect(isParserBijective(apiKeysParsers.page, '3', 3)).toBe(true);
    expect(isParserBijective(apiKeysParsers.status, 'revoked', 'revoked')).toBe(true);
    expect(isParserBijective(apiKeysParsers.search, 'alpha beta', 'alpha beta')).toBe(true);
    expect(isParserBijective(manageParsers.budgetState, 'no-quota', 'no-quota')).toBe(true);
    expect(isParserBijective(manageParsers.reportOpen, 'true', true)).toBe(true);
    expect(isParserBijective(manageParsers.period, '2026-07', '2026-07')).toBe(true);
    expect(isParserBijective(manageParsers.format, 'pdf', 'pdf')).toBe(true);
    expect(
      isParserBijective(manageParsers.include, 'totals,per-model', ['totals', 'per-model'])
    ).toBe(true);
    expect(isParserBijective(settingsParsers.renameProjectId, 'proj_7', 'proj_7')).toBe(true);
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
    expect(
      isParserBijective(adminBudgetSchedulesParsers.editScheduleId, 'sched_1', 'sched_1')
    ).toBe(true);
    // Every modal in the console, on one pair (owner directive 2026-09-03).
    expect(isParserBijective(dialogParsers.name, 'revoke-key', 'revoke-key')).toBe(true);
    expect(isParserBijective(dialogParsers.id, 'key_3', 'key_3')).toBe(true);
    expect(isParserBijective(dashboardExpandParsers.panelId, 'actors-table', 'actors-table')).toBe(
      true
    );
    // Every dashboard page's Export dialog's own two knobs, cross-route since #453.
    expect(isParserBijective(dashboardExportParsers.format, 'pdf', 'pdf')).toBe(true);
    expect(isParserBijective(settingsOverviewParsers.range, '7d', '7d')).toBe(true);
    expect(isParserBijective(settingsOverviewParsers.from, '2026-08-01', '2026-08-01')).toBe(true);
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
    // `/manage`'s consumption report is the last dialog that picks a MONTH: a dashboard-page
    // report inherits its window from the page's own range picker instead.
    expect(manageParsers.period.defaultValue).toBe(CURRENT_PERIOD);
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
