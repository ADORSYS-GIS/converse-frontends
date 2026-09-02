'use client';

import {
  debounce,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useMemo } from 'react';
import type { UsageGroupBy } from '@lightbridge/api-rest';
import type { ReportExportFormat } from '@lightbridge/ui-web';

/**
 * **The console's URL param contract — the single module that owns it (ADR 0011).**
 *
 * Every piece of state that describes *what the user is looking at* lives here, as a typed nuqs
 * parser with a default: project scope, dashboard view params, per-route filters and pagination,
 * selections, the active sub-nav tab, and which rail section is open as a sheet. Nothing else in
 * `apps/console` may declare a query param — one module, one writer, one contract.
 *
 * **The account is a path segment, not a param, as of IA v3 phase 1** ("account into the path"):
 * every screen lives under `/accounts/[accountId]/*`, and `client/use-account-id.ts`'s
 * `useAccountId()` reads it from the route. This module owns everything that is genuinely a query
 * param — which, for scope, is now the project alone (`projectScopeParsers` below).
 *
 * **Param names are product surface.** These strings appear in URLs users bookmark, share and
 * paste into tickets; renaming one is a breaking change to the same degree an API field rename is
 * (ADR 0011 Consequences). They are kebab-case in the URL and camelCase in TypeScript, bridged by
 * nuqs' `urlKeys` — so `groupBy` in code is `?group-by=` on the wire, and neither convention has
 * to bend for the other.
 *
 * **Three rules the whole table obeys:**
 *
 * 1. *Defaults stay out of the URL.* Every parser carries `.withDefault(...)`, and nuqs'
 *    `clearOnDefault` (its default, left on everywhere) removes a param the moment it returns to
 *    that value. A freshly-loaded screen therefore has a clean URL, and a shared URL carries only
 *    what the sender actually changed.
 * 2. *History is for navigation, not for knobs.* Range/bucket/group-by/filters/pagination write
 *    with `history: 'replace'` (nuqs' default, spelled out here because it is a decision, not an
 *    accident): dragging a segmented control through four options must not cost four Back presses.
 *    The params that represent *"I moved somewhere"* — scope, a row/series/request selection, the
 *    active tab — write with `history: 'push'`, which is what makes Back mean "undo that
 *    selection" and what the ADR's back/forward acceptance criterion is actually measuring.
 * 3. *High-frequency text is rate-limited.* The two free-text search boxes use
 *    `limitUrlUpdates: debounce(...)`: the React state (and therefore the input) updates on every
 *    keystroke, only the URL write waits for the typist to stop.
 *
 * What is deliberately **not** here: theme preference (ADR 0011 Decision 6 — a shared URL must not
 * restyle the app for its recipient), one-time API-key secrets and decision notes (they would be
 * copied into browser history and every link), and mutation results (they belong to the query
 * cache, see `use-shared-mutation.ts`).
 */

// ── shared: project scope ───────────────────────────────────────────────────────────────────

/**
 * Project scope — `?project=` — read by every screen under `/accounts/[accountId]/*`.
 *
 * **The account half of scope is a path segment, not a URL param, as of IA v3 phase 1** ("account
 * into the path"): every screen now lives under `/accounts/[accountId]/*`, and `useAccountId()`
 * (`client/use-account-id.ts`) reads it from the route, never from here. Only the project — a
 * narrowing WITHIN the account already named by the path — remains a query param, because a
 * project is optional (bare `/accounts/<id>/overview` means "every project in this account") in a
 * way the account segment itself never is.
 *
 * This is still "the URL is the cross-zone state bus" (ADR 0011 Decision 2) for the project half:
 * the scope picker writes it, the centre's ledger filters by it, and neither knows the other
 * exists. An empty `project` does not mean "no project" — it means *"every project in this
 * account"*, the parser's own default, which `clearOnDefault` keeps out of the URL.
 */
export const projectScopeParsers = {
  projectId: parseAsString.withDefault(''),
};

const projectScopeUrlKeys = { projectId: 'project' };

/** Scope is a navigation-grade change: Back should return to the previous project. */
const projectScopeOptions = { history: 'push' as const };

export function useProjectScopeParams() {
  return useQueryStates(projectScopeParsers, {
    urlKeys: projectScopeUrlKeys,
    ...projectScopeOptions,
  });
}

// ── / (account resolver) ─────────────────────────────────────────────────────────────────────

/** The three screens the account resolver can send a visitor on to — `ConsoleRoute` minus
 *  `settings`/`admin`, which are not (yet — Phase 2) reached under `/accounts/[accountId]/*`. */
export const RESOLVER_TARGETS = ['overview', 'projects', 'api-keys'] as const;
export type ResolverTarget = (typeof RESOLVER_TARGETS)[number];

/**
 * `?next=` — the account resolver's (`app/(console)/page.tsx`) own single param: which of the
 * three account-scoped screens to land on once an account id is resolved. Lets a link like
 * `/?next=api-keys` (bookmarked, or minted by a legacy-redirect table entry — `middleware.ts`)
 * survive the account resolution hop instead of always landing on Overview.
 */
export const resolverParsers = {
  next: parseAsStringLiteral(RESOLVER_TARGETS).withDefault('overview'),
};

const resolverUrlKeys = { next: 'next' };

export function useResolverParams() {
  return useQueryStates(resolverParsers, { urlKeys: resolverUrlKeys, history: 'replace' });
}

// ── shared: create-account dialog ───────────────────────────────────────────────────────────

/**
 * `?new-account=true` — whether the create-account dialog is open, read from wherever it can be
 * triggered.
 *
 * ADR-0026 (lightbridge-authz#564, "one identity may own many accounts") turned "+ New account"
 * into a standing action reachable from two structurally separate places at once: the workspace
 * switcher (chrome — mounted once, present on every route, `console-chrome.tsx`) and
 * `/settings/account`'s own `PageHeader`. Both have to open the SAME dialog instance, the same way
 * `projectScopeParsers` above is the project scope every zone reads without knowing the others
 * exist. That rules out a lifted local `useState` (`useConsolePalette`'s own pattern): the palette
 * is only ever triggered from chrome, so lifting it to `app/(console)/layout.tsx` and threading a
 * prop down to the two chrome zones is enough — this dialog also needs to open from inside a
 * routed screen's own subtree, which the layout cannot hand a prop to. Real view state instead —
 * Back closes it, same as every other dialog flag in this module — declared here rather than
 * under `settingsParsers` because chrome is not itself a route.
 */
export const createAccountParsers = {
  open: parseAsBoolean.withDefault(false),
};

const createAccountUrlKeys = { open: 'new-account' };

export function useCreateAccountDialogParams() {
  return useQueryStates(createAccountParsers, {
    urlKeys: createAccountUrlKeys,
    history: 'push' as const,
  });
}

// ── shared: dashboard report export (converse-frontends#453) ─────────────────────────────────

/**
 * `?export=true&export-format=pdf&export-tables=false` — the Export dialog on EVERY
 * `dashboards.yaml`-driven page.
 *
 * Cross-route and shared, the same shape `createAccountParsers`/`createProjectParsers` established
 * and for the same reason: the button is owned by the dashboard engine's page shell
 * (`dashboards/dashboard-page-shell.tsx`), not by any one route, so there is exactly one
 * declaration rather than one per page — a fifth `?report=`-shaped flag per YAML page is precisely
 * the drift this module exists to prevent.
 *
 * All three are real view state under ADR 0011, not drafts. `open` is "what am I looking at" (Back
 * closes it, same as every other dialog flag here). `format` and `tables` are the two knobs that
 * decide WHICH DOCUMENT the Generate button produces, so a link to a page with an export in
 * progress must carry them — and the route's own `?format=`/`?tables=` mean the same two things,
 * which is what makes an exported report reproducible from a URL someone pasted.
 *
 * Distinct names from `manageParsers`/`overviewParsers`' `format`/`reportOpen`: those belong to the
 * CONSUMPTION report (a month, a scope, a group-by) which is a different document with different
 * inputs, and a page could in principle mount both.
 */
export const DASHBOARD_EXPORT_FORMATS = ['pdf', 'csv'] as const;

export const dashboardExportParsers = {
  open: parseAsBoolean.withDefault(false),
  format: parseAsStringLiteral(DASHBOARD_EXPORT_FORMATS).withDefault('pdf'),
  // Defaults ON: a chart in a document nobody can hover states nothing without its values.
  tables: parseAsBoolean.withDefault(true),
};

const dashboardExportUrlKeys = {
  open: 'export',
  format: 'export-format',
  tables: 'export-tables',
};

export function useDashboardExportParams() {
  // `push`, like every other dialog-open flag in this module — Back closes the dialog.
  return useQueryStates(dashboardExportParsers, {
    urlKeys: dashboardExportUrlKeys,
    history: 'push' as const,
  });
}

// ── shared: create-project dialog ───────────────────────────────────────────────────────────

/**
 * `?new-project=true` — whether `CreateProjectDialog` is open. Lifted out of `manageParsers.
 * createOpen` (owner, 2026-08-30: "I create account in settings or in a raw dropdown, but project
 * only in projects? Not in settings?") into the SAME shared, cross-route shape
 * `createAccountParsers` above already established: `+ New project` is now reachable from
 * `/projects`' own `PageHeader` action, `/settings/projects`' own `PageHeader` action, AND the
 * inspector rail's quick-settings row (every route) — three structurally separate triggers that
 * must all open the ONE instance mounted in `app/(console)/layout.tsx`
 * (`use-create-project-dialog.ts`). The wire key changes (`create` on `/projects` meant this
 * specifically; `new-project` says so on every route it now opens from) — a genuine rename, not
 * a compatibility shim, since the flow itself moved cross-route.
 */
export const createProjectParsers = {
  open: parseAsBoolean.withDefault(false),
};

const createProjectUrlKeys = { open: 'new-project' };

export function useCreateProjectDialogParams() {
  return useQueryStates(createProjectParsers, {
    urlKeys: createProjectUrlKeys,
    history: 'push' as const,
  });
}

// ── report export — shared vocabulary (`/`, `/projects`) ────────────────────────────────────

/**
 * The report export dialog's format/include vocabulary — shared verbatim by `/`'s and
 * `/projects`'s own `?report=` params (phase 4 gives Overview the same `Export` action Projects'
 * `Monthly report` button already opens). Declared here, ahead of both routes' own param tables,
 * because a `const` must exist before either object literal below can reference it.
 */
export const REPORT_FORMATS = ['csv', 'pdf'] as const satisfies readonly ReportExportFormat[];
export const REPORT_INCLUDE_IDS = ['totals', 'per-model'] as const;
export type ReportIncludeId = (typeof REPORT_INCLUDE_IDS)[number];

/**
 * The month the monthly/period report defaults to, resolved **once at module load** rather than
 * per render — reading the clock during render makes output depend on when React happens to
 * re-render.
 *
 * It is a moving default by design: because it is the default, `clearOnDefault` keeps it out of
 * the URL, so a shared link without `?period=` means "the current month" for whoever opens it,
 * while a link to a *specific* month carries `?period=2026-07` explicitly.
 */
export const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

/**
 * The three parsers built from the vocabulary above. They were shared BY INSTANCE between
 * `overviewParsers` and `manageParsers`, so `?format=pdf` could not come to mean two things on two
 * routes' Export dialogs. C12 (converse-frontends#455) left `manageParsers` as their only holder:
 * the account dashboard's Export is `DashboardExportButton` now, with its own cross-route
 * `dashboardExportParsers`, so the consumption report — `/manage`'s — is the last dialog speaking
 * this vocabulary. They stay declared here rather than inlined, because a second consumption-report
 * surface would have to share them again, by instance, for the same reason.
 */
const reportPeriodParser = parseAsString.withDefault(CURRENT_PERIOD);
const reportFormatParser = parseAsStringLiteral(REPORT_FORMATS).withDefault('csv');
const reportIncludeParser = parseAsArrayOf(parseAsStringLiteral(REPORT_INCLUDE_IDS)).withDefault([
  'totals',
] as ReportIncludeId[]);

// ── / (overview) ─────────────────────────────────────────────────────────────────────────────

/**
 * `mtd` ("this month") is the default (2026-08-31 owner directive): the budget resets monthly, so
 * the dashboard's default window matches the billing period rather than an arbitrary rolling span.
 * It resolves to a CALENDAR-MONTH span (UTC month start -> now), not a rolling 30-day window — see
 * `overview-usage.ts`'s `resolveRangeWindow`. It is listed first so it reads as the natural
 * default in any UI that renders these in order (the range select, `RANGE_PRESETS`).
 */
export const OVERVIEW_RANGES = ['mtd', '7d', '30d', '90d'] as const;

/** `MultiSeriesSpendChart`'s own `scale` union (`@lightbridge/ui-web`), restated here rather than
 *  imported so this module's own literal-union assertions (`RESOLVER_TARGETS` etc.) stay
 *  self-contained. Every consumer is now a declarative dashboard's per-panel axis knob
 *  (`useDashboardScaleParams` below) — the two hand-declared board scales it used to serve
 *  (`overviewParsers.modelScale`, `settingsOverviewParsers.accountScale`) went with the
 *  hand-written boards themselves in C12. */
export const MULTI_SERIES_SPEND_SCALES = ['linear', 'log', 'indexed'] as const;

/**
 * `console-ui#312`, closed: this used to be a UI-facing pair (`'project' | 'model'`) that
 * `overview-usage.ts`'s own `OVERVIEW_GROUP_BY_TO_USAGE_GROUP_BY` bridged onto the real
 * `UsageGroupBy` enum — a translation table that existed only because the URL vocabulary was
 * picked before the usage contract was read closely. The values here are now literally a subset
 * of `UsageGroupBy` (`@lightbridge/api-rest`), asserted at the definition below, so the bridge
 * table is gone: the URL param IS the wire value.
 *
 * `user_name`/`metric_name`/`signal_type`/`account_id` are deliberately excluded — the phase 4
 * measurement's "DO NOT BUILD" list rules out `metric_name`/`signal_type` breakdowns outright,
 * `user_name` duplicates `user_id` for this console's purposes, and `account_id` only makes sense
 * for the estate overview's own account-scoped fan-out (`/settings/overview/usage`), which never
 * reads this per-account param at all.
 */
export const OVERVIEW_GROUP_BYS = [
  'project_id',
  'model',
  'user_id',
  'api_key_id',
] as const satisfies readonly UsageGroupBy[];

/**
 * The Overview dashboard's view params.
 *
 * **2026-09-02 (converse-frontends#455, story C12): the dashboard knobs are gone from this table.**
 * `/accounts/<id>/overview` renders from `dashboards.yaml` now, and its five deleted params each
 * steered something that no longer exists:
 *  - `groupBy` reshaped ONE share bar between project/model/user/API key. Those are four PANELS
 *    now, all visible at once, so there is nothing left for a dimension knob to switch.
 *  - `bucket` chose the bucket width; the engine derives it from the range (`bucket: auto`).
 *  - `model` only ever offered a single inert "All models" entry — it filtered nothing.
 *  - `modelScale` was one board's axis transform; every series panel now gets its own
 *    `?<panel-id>-scale=` knob, declared from the spec by `useDashboardScaleParams` below, because
 *    which panels a page has is DATA (a deployment can add one through the config volume).
 *  - `series` was the cross-zone chart selection; no engine panel type wires a selected key today.
 * A knob wired to nothing is a defect, not a harmless leftover — the same rule that took `bucket`
 * out of `settingsOverviewParsers`. What remains is the page's WINDOW and the export dialog.
 *
 * `range` and `from`/`to` are one value expressed two ways. `range` names a rolling preset and is
 * what the URL carries by default; `from`/`to` carry an explicit UTC span picked from the calendar.
 * **`from`/`to` win when both are present** — an explicit span is never silently re-rolled by a
 * preset that happens to still be in the URL. A preset write clears them; see
 * `overview-centre.tsx`.
 *
 * The export dialog's own five params (`reportOpen`/`period`/`reportGroupBy`/`format`/`include`)
 * went too. This page's Export is `DashboardExportButton` (converse-frontends#453), whose knobs are
 * `dashboardExportParsers` — one cross-route declaration for every YAML-driven page, rather than a
 * `?report=`-shaped flag per page. The consumption-report vocabulary survives where its dialog
 * still lives, on `manageParsers`.
 */
export const overviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

const overviewUrlKeys = {};

export function useOverviewParams() {
  return useQueryStates(overviewParsers, { urlKeys: overviewUrlKeys, history: 'replace' });
}

// ── /settings/overview/{usage,account,project,user} — IA v3 phase 4 analytics lenses ──────────

/**
 * The WINDOW every one of the four analytics lenses under `/settings/overview/*` is read over —
 * the account-family overview (`usage`) and the three scope-parameterised lenses
 * (`account`/`project`/`user`), each of which is its own `dashboards.yaml` entry since
 * converse-frontends#455 (story C12).
 *
 * Deliberately the SAME shape `overviewParsers` above declares (`range`/`from`/`to`, the
 * explicit-span-wins-over-preset rule, `resolveOverviewWindow` reused verbatim) rather than a
 * fifth divergent range picker: a reader who already knows what `?range=` and `?from=`/`?to=` mean
 * on `/accounts/<id>/overview` should not have to relearn them here. Declared as its own object
 * (not literally shared by reference with `overviewParsers`) because these lenses have no export
 * dialog of their own.
 *
 * **It is the window and nothing else, and every deletion from it has the same reason.** `bucket`
 * went in 2026-08-31 (a `?bucket=` that no request builder read); `accountSort` went with the
 * ranked-row list it sorted; `accountScale` and `series` went with C12, when these lenses became
 * YAML pages — a series panel's axis transform is now its own `?<panel-id>-scale=` knob, declared
 * FROM the page spec by `useDashboardScaleParams` below (which panels a page has is DATA, and a
 * deployment can add one through the config volume), and no engine panel type wires a selected
 * key. A knob wired to nothing is a defect, not a harmless leftover.
 */
export const settingsOverviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

const settingsOverviewUrlKeys = {};

export function useSettingsOverviewParams() {
  return useQueryStates(settingsOverviewParsers, {
    urlKeys: settingsOverviewUrlKeys,
    history: 'replace',
  });
}

// ── shared: ledger sort ──────────────────────────────────────────────────────────────────────

/** `LedgerTable`'s own `LedgerSortDirection` — a plain string union re-declared rather than
 *  imported: it is a UI-layer concept (which way the caret points), not a URL-contract one, and
 *  this module never imports FROM `ui-web` component internals, only shared prop/data types. */
export const LEDGER_SORT_DIRECTIONS = ['asc', 'desc'] as const;

// ── /api-keys ────────────────────────────────────────────────────────────────────────────────

export const API_KEY_STATUSES = ['all', 'active', 'revoked'] as const;

/** The three date columns the Api-Keys ledger can sort by — `ApiKeyRow`'s own `created`/
 *  `lastUsed`/`expires` keys, reused verbatim as the URL vocabulary so the column key IS the sort
 *  key (no separate lookup table to drift). */
export const API_KEY_SORT_KEYS = ['created', 'lastUsed', 'expires'] as const;

/**
 * `q` is the ledger's free-text name filter, debounced onto the URL: the input stays responsive
 * per keystroke while the address bar (and the refine query it drives) settles once typing stops.
 *
 * `revoke` holds the id of the key whose revoke confirmation is open, and `delete` the same for
 * the (admin-gated, ticket #321) delete confirmation. A dialog *target* is view state — Back
 * closes the dialog, and a colleague can be sent straight to the confirmation. Neither dialog's
 * failure reason is here: it belongs to the mutation that failed.
 *
 * `create` (ticket #319) is the same idea with no id to carry — the create-key dialog has exactly
 * one possible target (the active project), so a bare boolean is the whole contract. Its draft
 * inputs (name/expiry/plan) are NOT here: `use-api-keys-screen.ts`'s own "SANCTIONED LOCAL STATE"
 * comment explains why a typed-but-unsent form draft must not reach the URL or history.
 */
export const apiKeysParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(API_KEY_STATUSES).withDefault('all'),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  selectedKeyId: parseAsString.withDefault(''),
  revokeKeyId: parseAsString.withDefault(''),
  deleteKeyId: parseAsString.withDefault(''),
  createOpen: parseAsBoolean.withDefault(false),
  // Default matches the ledger's pre-sortable hardcoded `sorters: [{ field: 'createdAt', order:
  // 'desc' }]` (`use-api-keys-screen.ts`) — newest key first, until a header is pressed.
  sortKey: parseAsStringLiteral(API_KEY_SORT_KEYS).withDefault('created'),
  sortDirection: parseAsStringLiteral(LEDGER_SORT_DIRECTIONS).withDefault('desc'),
};

const apiKeysUrlKeys = {
  search: 'q',
  selectedKeyId: 'key',
  revokeKeyId: 'revoke',
  deleteKeyId: 'delete',
  createOpen: 'create',
  sortKey: 'sort',
  sortDirection: 'dir',
};

export function useApiKeysParams() {
  return useQueryStates(apiKeysParsers, { urlKeys: apiKeysUrlKeys, history: 'replace' });
}

/** Row selection and the revoke/delete dialogs are navigation-grade; the filters above them are not. */
export const API_KEYS_SELECTION_OPTIONS = { history: 'push' as const };

// ── /projects (params still named 'manage*' internally — the route renamed, this module's own
// internal identifiers did not) ─────────────────────────────────────────────────────────────

// `active | suspended` are the only two values `Project.status` ever holds (authz.cstack:274-277,
// 699-700 — mutated only by `disableProject`/`enableProject`). `archived` never existed on the
// backend (issue #268); a bookmarked `?status=archived` link now falls back to nuqs's `all`
// default rather than silently matching zero rows forever.
export const MANAGE_STATUSES = ['all', 'active', 'suspended'] as const;
export const MANAGE_BUDGET_STATES = ['all', 'quota-set', 'no-quota'] as const;
export const MANAGE_REPORT_GROUP_BYS = ['project', 'model'] as const;
/** The two sortable Projects ledger columns (phase 5 revamp brief — Name and the now-wired Spend
 *  MTD). `ProjectRow`'s own column keys, reused verbatim as the URL vocabulary. */
export const PROJECTS_SORT_KEYS = ['name', 'spendMtd'] as const;
// `REPORT_FORMATS`/`REPORT_INCLUDE_IDS`/`ReportIncludeId`/`CURRENT_PERIOD` moved above the
// "/ (overview)" section (phase 4): both routes' report dialogs now share the same vocabulary,
// declared once ahead of whichever param table references it first.

/**
 * `include` is a set, so it is a comma-separated array param (`?include=totals,per-model`) rather
 * than one boolean param per toggle — the URL stays legible and a new toggle costs no new param.
 * `parseAsArrayOf` compares by value, so the default set still clears itself out of the URL.
 *
 * `reportOpen` (`?report=`) is shell revamp phase 3's replacement for the deleted right rail's
 * persistent MONTHLY REPORT section: `Monthly report` is now a `PageHeader.action` button that
 * opens `ReportExportDialog` — the dialog has exactly one possible target (the scoped
 * account/period), so a bare boolean is the whole contract.
 *
 * What is NO LONGER here: `accountNameOpen` (`?account-name=`) — moved to `/settings` along with
 * the panel that opens it (see `settingsParsers` below) — and `createOpen` (ticket #303, rail-
 * return round 2026-08-30: lifted into the shared, cross-route `createProjectParsers` above,
 * alongside `createAccountParsers`, since `+ New project` is reachable from `/settings/projects`
 * and the inspector rail now too, not only from here). A `/projects` bookmark carrying either old
 * flag now simply ignores an unknown param rather than opening a dialog on a screen that no
 * longer mounts one.
 */
export const manageParsers = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  status: parseAsStringLiteral(MANAGE_STATUSES).withDefault('all'),
  budgetState: parseAsStringLiteral(MANAGE_BUDGET_STATES).withDefault('all'),
  selectedProjectId: parseAsString.withDefault(''),
  reportOpen: parseAsBoolean.withDefault(false),
  period: reportPeriodParser,
  reportGroupBy: parseAsStringLiteral(MANAGE_REPORT_GROUP_BYS).withDefault('project'),
  format: reportFormatParser,
  include: reportIncludeParser,
  // Default matches the ledger's pre-sortable hardcoded `sorters: [{ field: 'name', order: 'asc'
  // }]` (`use-projects-screen.ts`) — alphabetical, until a header is pressed.
  sortKey: parseAsStringLiteral(PROJECTS_SORT_KEYS).withDefault('name'),
  sortDirection: parseAsStringLiteral(LEDGER_SORT_DIRECTIONS).withDefault('asc'),
};

const manageUrlKeys = {
  search: 'q',
  budgetState: 'budget-state',
  selectedProjectId: 'row',
  reportOpen: 'report',
  reportGroupBy: 'report-group',
  sortKey: 'sort',
  sortDirection: 'dir',
};

export function useManageParams() {
  return useQueryStates(manageParsers, { urlKeys: manageUrlKeys, history: 'replace' });
}

/** Picking a project row retargets the SELECTION rail — a view change worth a Back press. */
export const MANAGE_SELECTION_OPTIONS = { history: 'push' as const };

/**
 * `?create=true` — `/settings/accounts/<id>/projects`' own entry flag (task directive: "project
 * creation would be inside /settings/accounts/<account-id>/projects?create=true"). Distinct from
 * `createProjectParsers.open` (`?new-project=`, the SHARED cross-route dialog-open flag every
 * trigger writes): this one is a one-shot LANDING intent, not itself the dialog's open state —
 * `ProjectsCentre` reads it once on mount, calls the shared trigger
 * (`useOpenCreateProjectDialog().open()`, which sets `?new-project=true`) and immediately clears
 * this flag (`history: 'replace'`, so the landing hop never costs a Back press), leaving
 * `?new-project=` as the one param that actually governs the dialog's open/close state from then
 * on — the same "?new-account=true IS in the URL, its typed contents are not" split every other
 * dialog flag in this module follows, one level up (this flag names INTENT, not even a draft).
 */
export const projectsEntryParsers = {
  create: parseAsBoolean.withDefault(false),
};

export function useProjectsEntryParams() {
  return useQueryStates(projectsEntryParsers, { history: 'replace' });
}

// ── /settings ─────────────────────────────────────────────────────────────────

/**
 * Settings owns the console's account-level and project-level *identity* writes, so its two params
 * are both "which write is open", never "what has been typed into it".
 *
 * `accountNameOpen` (`?account-name=true`) moved here from `manageParsers` together with
 * `AccountPanel` itself (owner, 2026-08-29: "We cannot modify account core information on the same
 * page we're filtering"). Under ADR-0026 it drives exactly one procedure now —
 * `updateAccountName`, renaming whichever account is currently SCOPED — not two: `createAccount`
 * moved out to its own cross-route flag (`createAccountParsers.open`, `?new-account=`) once
 * account creation stopped being something the data alone could derive ("does this identity
 * already have an account" stopped being the question the moment one identity could hold several).
 * The wire key stays `account-name`, deliberately distinct from scope's own `account` (which
 * carries an id, not a flag) and from the new `new-account` flag (a different write entirely).
 *
 * `renameProjectId` (`?row=<project id>`) carries an ID rather than a boolean, which is the one
 * structural difference from every other dialog param in this module: the account dialog has
 * exactly one possible target (the signed-in subject), while a rename has as many targets as the
 * account has projects. A boolean would have to be paired with a separate "which row" param — two
 * params that can contradict each other — so the id IS the open flag, exactly the way
 * `apiKeysParsers.revokeKeyId` already works.
 *
 * Phase 9 (Addition C) split what `renameProjectId` used to mean in two: it now names the row
 * `DetailSheet` has open (a SELECTION — clicking a project row), and `projectNameOpen` is a
 * separate boolean for whether the RENAME dialog is stacked on top of that sheet, targeting the
 * same id. Two params rather than one because they are two different things a person does: open a
 * project to look at it, versus open its rename dialog — the settings list's own row click no
 * longer implies "and also start renaming this."
 *
 * Both write with `push` (`SETTINGS_DIALOG_OPTIONS`): opening a dialog that is about to perform a
 * write is navigation, and Back must close it rather than leave the screen. The typed-but-unsent
 * names in either dialog are NOT here — see `use-settings-screen.ts`'s own "SANCTIONED LOCAL
 * STATE" comment for why a draft must never reach the URL or browser history.
 *
 * `search`/`page` (phase 6, admin/settings revamp): `/settings/projects`' own filter and pager,
 * the same idiom `apiKeysParsers`/`manageParsers` already use — the unbounded N×7 project dump
 * this screen used to render died in favour of a search box + 10/page `Pagination`, so it needs
 * the same two params every OTHER browsable list on the console carries. Both `replace`
 * (rule 2 — knobs, not navigation), and `search` is debounced onto the URL the same way the two
 * ledger search boxes are.
 */
export const settingsParsers = {
  accountNameOpen: parseAsBoolean.withDefault(false),
  renameProjectId: parseAsString.withDefault(''),
  projectNameOpen: parseAsBoolean.withDefault(false),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  page: parseAsInteger.withDefault(1),
};

const settingsUrlKeys = {
  accountNameOpen: 'account-name',
  renameProjectId: 'row',
  projectNameOpen: 'rename',
  search: 'q',
  page: 'page',
};

export function useSettingsParams() {
  return useQueryStates(settingsParsers, { urlKeys: settingsUrlKeys, history: 'replace' });
}

/** Opening or closing either dialog is navigation-grade: Back closes it, it does not leave. */
export const SETTINGS_DIALOG_OPTIONS = { history: 'push' as const };

// ── /admin ───────────────────────────────────────────────────────────────────────────────────

/** The queue's one sortable column — `RefillRequestRow`'s own `submittedAgo`, sorted by the
 *  request's real `createdAt` (`use-refills-queue-screen.ts`). A single-member union rather than a bare
 *  boolean, matching every other ledger's `sortKey`/`sortDirection` pair (`PROJECTS_SORT_KEYS`,
 *  `API_KEY_SORT_KEYS`) so a second sortable column costs no new shape later. */
export const ADMIN_SORT_KEYS = ['submitted'] as const;

/**
 * `/admin`'s params: the review queue's sort, its selected request, and its page cursor.
 *
 * Phase 4 (2026-08-30) deleted `/admin`'s own dashboard section (moved to `/`, gated behind
 * `session.isAdmin`). Phase 6 (admin/settings revamp) deletes the Pending/Decided tab that used
 * to live here too — `tab`/`ADMIN_REVIEW_TABS` are gone, because the Decided side they switched
 * to was never backed by a real listing (see the deleted `sections/decisions-ledger`'s own doc
 * comment). `/admin` is now ONE screen with no sub-nav param at all.
 *
 * `after` (phase 6) is the pending queue's page cursor — `listPendingAugmentationRequests`'
 * own `after`/`nextCursor` contract, not a page NUMBER: `use-refills-queue-screen.ts` keeps the stack of
 * cursors a `Previous` press needs in local state (a browser-history-shaped concept a URL param
 * cannot express on its own), and only the CURRENT page's cursor is ever written here.
 *
 * All three write with `push` (ADR 0011 rule 2): the sort is this screen's own column header, a
 * selected request is a selection, and moving a page is navigation — Back walks each of them
 * back rather than leaving the screen.
 */
export const adminParsers = {
  selectedRequestId: parseAsString.withDefault(''),
  sortKey: parseAsStringLiteral(ADMIN_SORT_KEYS).withDefault('submitted'),
  sortDirection: parseAsStringLiteral(LEDGER_SORT_DIRECTIONS).withDefault('asc'),
  after: parseAsString.withDefault(''),
};

const adminUrlKeys = {
  selectedRequestId: 'request',
  sortKey: 'sort',
  sortDirection: 'dir',
  after: 'after',
};

export function useAdminParams() {
  return useQueryStates(adminParsers, { urlKeys: adminUrlKeys, history: 'push' });
}

// ── /admin/overview ──────────────────────────────────────────────────────────────────────────

/**
 * `/admin/overview`'s own params — the operator dashboard's date range plus one axis-transform
 * knob per SERIES PANEL on the page. Same `range`/`from`/`to` shape `overviewParsers`/
 * `settingsOverviewParsers` already declare (the explicit-span-wins-over-preset rule,
 * `resolveOverviewWindow` reused verbatim) rather than a fourth divergent range picker.
 *
 * **2026-09-02 (converse-frontends#447, story C4): the six hand-declared per-board scale knobs are
 * gone from this table.** The page's boards come from `dashboards.yaml` now, so the set of series
 * panels — and therefore the set of axis knobs — is DATA, not something this module can enumerate
 * at build time: a deployment may add or remove a panel through the config-volume override without
 * a rebuild (owner ruling Q11). A fixed list here would have silently left such a panel's toggle
 * unshareable, or worse, steering nothing. `useDashboardScaleParams` below declares them from the
 * page spec instead, so this table keeps only what genuinely belongs to the PAGE: its window.
 *
 * (`refill-decisions-scale` went with the same change, and would have anyway: it named a board
 * that never existed — there is no procedure that lists decided refill requests,
 * lightbridge-authz#556 — so the knob steered nothing from the day it shipped.)
 */
export const adminOverviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

const adminOverviewUrlKeys = {};

export function useAdminOverviewParams() {
  return useQueryStates(adminOverviewParsers, {
    urlKeys: adminOverviewUrlKeys,
    history: 'replace',
  });
}

// ── /admin/usage ─────────────────────────────────────────────────────────────────────────────

/**
 * The three entities `/admin/usage`'s lens-driven panels can be about (converse-frontends#448).
 * USER FIRST, and the order here is the order the `SegmentedControl` renders in — the owner's
 * actor-identity rule ("actor means the user first, then account, then project"), stated in the
 * one module that owns this page's URL vocabulary.
 *
 * Kept as a literal here rather than imported from `dashboards/dashboard-spec.ts` because this
 * module is the app's only nuqs importer and is deliberately free of dashboard-engine imports;
 * `admin-usage-page.test.ts` asserts the two lists agree, so they cannot drift silently.
 */
export const ADMIN_USAGE_LENSES = ['user', 'account', 'project'] as const;
export type AdminUsageLens = (typeof ADMIN_USAGE_LENSES)[number];

/**
 * `/admin/usage`'s own params: the range every dashboard page owns, plus this page's `lens`.
 *
 * The per-panel axis knobs come from `useDashboardScaleParams` and the per-table sort/page knobs
 * from `useDashboardTableParams` below — both declared FROM the page spec for the same reason
 * `/admin/overview`'s were (a deployment can add a panel through the config-volume override
 * without a rebuild, and a fixed table here would leave its knob steering nothing).
 *
 * `history: 'replace'` for all four: a range and a lens are view knobs, not navigation, and
 * dragging a segmented control must not cost a Back press per click (ADR 0011 rule 2). Sort and
 * page are the exception and say so at their own declaration.
 */
export const adminUsageParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  lens: parseAsStringLiteral(ADMIN_USAGE_LENSES).withDefault('user'),
};

const adminUsageUrlKeys = {};

export function useAdminUsageParams() {
  return useQueryStates(adminUsageParsers, {
    urlKeys: adminUsageUrlKeys,
    history: 'replace',
  });
}

// ── /admin/roles ─────────────────────────────────────────────────────────────────────────────

/**
 * `/admin/roles`' params — the grant directory's filter, its page cursor, and its two dialogs
 * (converse-frontends#452, story C9).
 *
 * `role` and `revoked` are FILTERS, so they write with `replace` (ADR 0011 rule 2: a knob must not
 * cost a Back press per click) — but they ARE in the URL, because "who currently holds
 * lightbridge-admin" is precisely the view an operator pastes into an incident thread. `''` is the
 * role filter's own all-values sentinel and can never collide with a real role.
 *
 * `after` is `listPlatformRoleGrants`' own cursor — the last entry's `grantedAt`, not a page
 * NUMBER. The stack of cursors a `Previous` press needs stays in component state, the same split
 * `useAdminParams` documents for the refills queue: the CURRENT page's cursor is a fact about what
 * is on screen, the trail that got there is a browser-history-shaped concept a URL param cannot
 * express on its own.
 *
 * `grant`/`revoke` are the two dialogs, and they write with `push` — opening a modal is
 * navigation-grade, so Back closes it rather than leaving the screen (the same contract
 * `SETTINGS_DIALOG_OPTIONS` states). The GRANT dialog's own field drafts (the person query, the
 * chosen role, the reason) deliberately stay OUT of the URL: they are an in-flight form draft
 * naming a real person, which ADR 0011 Decision 3 keeps out of history and out of any link copied
 * from the address bar.
 */
export const adminRolesParsers = {
  role: parseAsString.withDefault(''),
  includeRevoked: parseAsBoolean.withDefault(false),
  after: parseAsString.withDefault(''),
  grantOpen: parseAsBoolean.withDefault(false),
  revokeGrantId: parseAsString.withDefault(''),
};

const adminRolesUrlKeys = {
  role: 'role',
  includeRevoked: 'revoked',
  after: 'after',
  grantOpen: 'grant',
  revokeGrantId: 'revoke',
};

/** Filters and the cursor: `replace`. Paging is a knob on this screen, not a destination — the
 *  ledger is one view of one collection, and a Back press should leave `/admin/roles` rather than
 *  walk the operator back through however many pages they scrolled past. */
export function useAdminRolesParams() {
  return useQueryStates(adminRolesParsers, { urlKeys: adminRolesUrlKeys, history: 'replace' });
}

/** Opening or closing either dialog is navigation-grade: Back closes it, it does not leave. */
export const ADMIN_ROLES_DIALOG_OPTIONS = { history: 'push' as const };

// ── /admin/sessions ──────────────────────────────────────────────────────────────────────────

/**
 * The session ledger's status filter, as the URL spells it.
 *
 * `inactive` is NOT a `querySessions` status. That procedure's own `status` filter takes exactly
 * one of `active | revoked | expired | all` (lightbridge-authz#657), so "inactive" — the operator
 * question "what is no longer live?" — is two calls whose pages the container merges, not one
 * `all` narrowed on the client. Two queries is the honest shape: filtering an `all` page down to
 * its dead rows would make every count and every `next` cursor a claim about a set the server
 * never returned, and the pager would skip pages whose rows were all active.
 *
 * `active` is the default — an operator opening a session list wants the live ones, and "show me
 * three months of dead rows too" should be a deliberate press (the same default `querySessions`
 * itself takes).
 */
export const SESSION_STATUS_FILTERS = ['active', 'inactive', 'all'] as const;

/** `sessions.kind`'s own pair, plus the unfiltered case. */
export const SESSION_KIND_FILTERS = ['all', 'browser', 'token'] as const;

/**
 * `/admin/sessions`' view params (converse-frontends#450, story C7).
 *
 * `q` is the free-text query handed to `searchUsers`, debounced onto the URL exactly as
 * `apiKeysParsers.search` is: the input stays responsive per keystroke while the address bar — and
 * the search request it drives — settles once typing stops. It is the SEARCH, not the filter.
 *
 * `user` is the filter: the account id (`sessions.subject`, which IS the owner's JWT `sub` per
 * lightbridge-authz ADR-0006) of the person the operator picked out of `searchUsers`' matches.
 * The two are separate params because they are separate facts — `querySessions` filters on an
 * EXACT subject, so a typed string can never be the filter itself, and collapsing them would make
 * "typed three characters, still seeing everyone" look like a bug instead of the honest "pick
 * which of these four people you meant".
 *
 * `after` is the opaque page cursor `SessionPage.next` hands back — passed through verbatim, never
 * constructed. `use-admin-sessions-screen.ts` keeps the stack of cursors a `Previous` press needs
 * in local state, the same browser-history-shaped concept `use-refills-queue-screen.ts` already
 * documents; only the CURRENT page's cursor is ever written here.
 *
 * `selected` is the row whose `BottomSheet` is open — a selection, so a colleague can be sent
 * straight to one session and Back closes the sheet rather than leaving the screen.
 *
 * History: the group writes `replace` (dragging a segmented control must not cost a Back press per
 * click, ADR 0011 rule 2); `after` and `selected` are written with
 * `ADMIN_SESSIONS_NAVIGATION_OPTIONS` instead, because moving a page and opening a detail are both
 * navigation.
 */
export const adminSessionsParsers = {
  status: parseAsStringLiteral(SESSION_STATUS_FILTERS).withDefault('active'),
  kind: parseAsStringLiteral(SESSION_KIND_FILTERS).withDefault('all'),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  subject: parseAsString.withDefault(''),
  after: parseAsString.withDefault(''),
  selectedSessionId: parseAsString.withDefault(''),
};

const adminSessionsUrlKeys = {
  search: 'q',
  subject: 'user',
  selectedSessionId: 'selected',
};

export function useAdminSessionsParams() {
  return useQueryStates(adminSessionsParsers, {
    urlKeys: adminSessionsUrlKeys,
    history: 'replace',
  });
}

/** Paging and opening a session's detail are navigation-grade; the filters above them are not. */
export const ADMIN_SESSIONS_NAVIGATION_OPTIONS = { history: 'push' as const };

// ── declarative dashboards: one axis knob per series panel ───────────────────────────────────

/** A `dashboards.yaml` panel id → the query param carrying that panel's axis transform. Kebab
 *  already, because panel ids are (`estate-spend` → `?estate-spend-scale=log`). */
export function dashboardScaleKey(panelId: string): string {
  return `${panelId}-scale`;
}

/**
 * The axis-transform knobs for a declarative dashboard page — one per series panel, declared FROM
 * the page's own panel ids rather than from a hand-written table (converse-frontends#447, C4).
 *
 * This is the one place in this module whose params are built at render time, and it is the only
 * honest option: which panels a YAML page has is data, and a deployment can change it through the
 * config volume without a rebuild. The alternatives were both worse — a fixed table would leave an
 * override-added panel's toggle steering nothing, and component state for the unmatched ones would
 * put genuinely shareable view state (which axis a chart is on) outside the URL, which is exactly
 * what ADR 0011 Decision 3 forbids. Declaring the params from the spec keeps every panel's knob in
 * the URL and keeps this module the only nuqs importer in the app.
 *
 * **No `withDefault`.** A panel's default axis is stated once, in the YAML (`options.scale`), and
 * `null` here means "use it". A default in both places would silently override the document the
 * moment the two disagreed, which is the drift externalizing the dashboards exists to end.
 *
 * `history: 'replace'` (ADR 0011 rule 2): dragging a segmented control must not cost a Back press
 * per click, the same idiom every other axis knob in this module already uses.
 */
export function useDashboardScaleParams(panelIds: readonly string[]) {
  // Keyed on the joined ids, not the array's identity: a caller deriving the list inside a render
  // would otherwise rebuild the parsers (and nuqs' subscriptions) on every paint.
  const identity = panelIds.join(',');
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        identity
          .split(',')
          .filter((id) => id.length > 0)
          .map((id) => [dashboardScaleKey(id), parseAsStringLiteral(MULTI_SERIES_SPEND_SCALES)])
      ),
    [identity]
  );
  return useQueryStates(parsers, { history: 'replace' });
}

// ── declarative dashboards: sort + page per TABLE panel ──────────────────────────────────────

/** A `dashboards.yaml` table panel id → its three query params. Kebab already, because panel ids
 *  are (`actors-table` → `?actors-table-sort=cost&actors-table-dir=desc&actors-table-page=2`). */
export function dashboardSortKey(panelId: string): string {
  return `${panelId}-sort`;
}
export function dashboardDirKey(panelId: string): string {
  return `${panelId}-dir`;
}
export function dashboardPageKey(panelId: string): string {
  return `${panelId}-page`;
}

/**
 * Sort and page for a declarative dashboard page's TABLE panels — one triple per table, declared
 * from the page's own panel ids (converse-frontends#448, story C5), exactly as
 * `useDashboardScaleParams` declares the axis knobs.
 *
 * **Per table, not per page.** `/admin/usage` carries two (actors, channels); one shared sort key
 * would mean sorting the actor ledger silently re-sorted the channel one, and a shared page cursor
 * would jump both.
 *
 * **No `withDefault` on the sort pair.** `null` means "the panel's own default order" (cost
 * descending, which is what an operator opens a spend table wanting), and a default here would be
 * a second place that decision lived. `page` DOES default, to `0`, because a page index has no
 * meaningful "unset" — the first page is the default reading, not a fallback for a missing one.
 *
 * **`history: 'push'`** — ADR 0011 rule 2: a sort is this screen's own column header and moving a
 * page is navigation, so Back walks each of them back rather than leaving the screen. That is the
 * opposite of the scale knobs above, and deliberately so; every other ledger in this module
 * (`apiKeysParsers`, `manageParsers`, `adminParsers`) makes the same split.
 */
export function useDashboardTableParams(panelIds: readonly string[]) {
  const identity = panelIds.join(',');
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        identity
          .split(',')
          .filter((id) => id.length > 0)
          .flatMap((id) => [
            [dashboardSortKey(id), parseAsString],
            [dashboardDirKey(id), parseAsStringLiteral(LEDGER_SORT_DIRECTIONS)],
            [dashboardPageKey(id), parseAsInteger.withDefault(0)],
          ])
      ),
    [identity]
  );
  return useQueryStates(parsers, { history: 'push' });
}

// ── /admin/refill-policies ──────────────────────────────────────────────────────────────────

/**
 * `/admin/refill-policies`'s own mode-split params — TWO modes now, not three (owner review round
 * 2, 2026-08-31, converse-frontends#368 finding #4, verbatim): "You made out of
 * /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But it's
 * fine. Just move it to a page /admin/refill-policies/create." Create moved OFF this query-param
 * table to its own route segment, `/admin/refill-policies/create`
 * (`use-refill-policy-create-screen.ts`) — there is no `create`/`createOpen` param left here at
 * all; a bookmarked `?create=true` still works via `middleware.ts`'s own redirect. `edit`/
 * `simulate` are unchanged (the owner named only create) — the original ruling that put all three
 * behind query params (verbatim: "/admin/refill-policies should be for listing them
 * /admin/refill-policies?create=true or /admin/refill-policies?edit=<id> to create or edit,
 * respectively, /admin/refill-policies?simulate=<id> to simulate" — and never simulate on the same
 * view as create/edit) still governs the two that remain.
 *
 * `policySetId` is the LIST mode's own lookup target, debounced onto the URL the same way the two
 * ledger search boxes are: there is no procedure that lists which policy sets exist
 * (`converse-frontends#368`), so "which one am I looking at" is exactly the shareable view state
 * ADR 0011 puts in the URL, not a component-local search box. `editPolicySetId`/
 * `simulatePolicySetId` are the two remaining modes — an id IS the open flag for the target
 * policy set, the same shape `apiKeysParsers.revokeKeyId`/`settingsParsers.renameProjectId`
 * already use. Both mode params write with `push` (`ADMIN_REFILL_POLICIES_MODE_OPTIONS`) — Back
 * must close the form/simulator rather than leave the screen — while the lookup itself stays the
 * hook's own default `replace`, the same knob-vs-navigation split `apiKeysParsers`/
 * `API_KEYS_SELECTION_OPTIONS` already draws.
 */
export const adminRefillPoliciesParsers = {
  policySetId: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  editPolicySetId: parseAsString.withDefault(''),
  simulatePolicySetId: parseAsString.withDefault(''),
};

const adminRefillPoliciesUrlKeys = {
  policySetId: 'policy-set',
  editPolicySetId: 'edit',
  simulatePolicySetId: 'simulate',
};

export function useAdminRefillPoliciesParams() {
  return useQueryStates(adminRefillPoliciesParsers, {
    urlKeys: adminRefillPoliciesUrlKeys,
    history: 'replace',
  });
}

/** Switching between list/create/edit/simulate is navigation-grade: Back closes the form/
 *  simulator rather than leaving the screen. */
export const ADMIN_REFILL_POLICIES_MODE_OPTIONS = { history: 'push' as const };

// ── /admin/budget-schedules ─────────────────────────────────────────────────────────────────

/**
 * `/admin/budget-schedules`' own params (converse-frontends#451, story C8) — the SAME URL-mode
 * shape `/admin/refill-policies` already uses, deliberately: an id IS the open flag for its target
 * (`apiKeysParsers.revokeKeyId`/`settingsParsers.renameProjectId`'s idiom), `create` is its own
 * route segment rather than a param, and every one of these writes with `push`
 * (`ADMIN_BUDGET_SCHEDULES_MODE_OPTIONS`).
 *
 *  - `editScheduleId` (`?edit=<id>`) — opens the schedule form on an existing row. Unlike the
 *    refill-policy edit route, this one is a REAL prefill: `listBudgetResetSchedules` returns every
 *    field, so the form opens on the stored schedule rather than a blank draft wearing an edit
 *    label.
 *  - `previewScheduleId` (`?preview=<id>`) — opens the dry-run sheet. In the URL and not component
 *    state because a preview is exactly the thing an operator sends to a colleague before enabling
 *    a rule that rewrites the estate's balances ("look at what this would do") — ADR 0011's own
 *    test for shareable view state.
 *  - `deleteScheduleId` (`?delete=<id>`) — opens the typed confirmation. Same reason the two
 *    ledgers put `revokeKeyId`/`deleteKeyId` in the URL: Back must close the dialog.
 *
 * All three are `push` because each opens a surface Back should close rather than leave the screen.
 * There is no `sort` param: the backend returns schedules oldest-first and this is operator-authored
 * configuration measured in tens of rows (`authz.cstack`: "Unpaginated on purpose"), so the ledger
 * renders no sortable header and there is no order for a param to carry.
 */
export const adminBudgetSchedulesParsers = {
  editScheduleId: parseAsString.withDefault(''),
  previewScheduleId: parseAsString.withDefault(''),
  deleteScheduleId: parseAsString.withDefault(''),
};

const adminBudgetSchedulesUrlKeys = {
  editScheduleId: 'edit',
  previewScheduleId: 'preview',
  deleteScheduleId: 'delete',
};

export function useAdminBudgetSchedulesParams() {
  return useQueryStates(adminBudgetSchedulesParsers, {
    urlKeys: adminBudgetSchedulesUrlKeys,
    history: 'push',
  });
}

/** Opening the form, the preview sheet or the delete confirmation is navigation-grade: Back closes
 *  the surface rather than leaving the screen. */
export const ADMIN_BUDGET_SCHEDULES_MODE_OPTIONS = { history: 'push' as const };

// ── the contract, as data ────────────────────────────────────────────────────────────────────

/**
 * The whole param contract in one inspectable value.
 *
 * It exists so `url-state.test.ts` can assert the properties the ADR actually cares about —
 * defaults round-trip out of the URL, every parser is bijective, no two routes disagree about what
 * a shared name like `page` or `q` means — without hand-listing the params a second time and
 * letting the two lists drift.
 */
export const URL_PARAM_CONTRACT = {
  projectScope: { parsers: projectScopeParsers, urlKeys: projectScopeUrlKeys },
  resolver: { parsers: resolverParsers, urlKeys: resolverUrlKeys },
  createAccount: { parsers: createAccountParsers, urlKeys: createAccountUrlKeys },
  createProject: { parsers: createProjectParsers, urlKeys: createProjectUrlKeys },
  dashboardExport: { parsers: dashboardExportParsers, urlKeys: dashboardExportUrlKeys },
  overview: { parsers: overviewParsers, urlKeys: overviewUrlKeys },
  settingsOverview: { parsers: settingsOverviewParsers, urlKeys: settingsOverviewUrlKeys },
  apiKeys: { parsers: apiKeysParsers, urlKeys: apiKeysUrlKeys },
  manage: { parsers: manageParsers, urlKeys: manageUrlKeys },
  settings: { parsers: settingsParsers, urlKeys: settingsUrlKeys },
  admin: { parsers: adminParsers, urlKeys: adminUrlKeys },
  adminOverview: { parsers: adminOverviewParsers, urlKeys: adminOverviewUrlKeys },
  adminRefillPolicies: {
    parsers: adminRefillPoliciesParsers,
    urlKeys: adminRefillPoliciesUrlKeys,
  },
  adminBudgetSchedules: {
    parsers: adminBudgetSchedulesParsers,
    urlKeys: adminBudgetSchedulesUrlKeys,
  },
  adminSessions: { parsers: adminSessionsParsers, urlKeys: adminSessionsUrlKeys },
} as const;
