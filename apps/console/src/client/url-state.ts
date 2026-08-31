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
 * The three parsers built from the vocabulary above — declared once and shared **by instance**
 * between `overviewParsers` and `manageParsers` below, the same way `adminParsers` used to share
 * `overviewParsers.range` etc. by reference rather than by a lookalike copy: `?format=pdf` has to
 * mean one thing on both routes' Export dialogs, and sharing the instance makes that a structural
 * guarantee (`url-state.test.ts` asserts the identity), not a convention two literals could drift
 * out of.
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
export const OVERVIEW_BUCKETS = ['hour', 'day', 'week'] as const;

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
 * `model` is a plain string rather than a literal union: model ids come from the usage backend, so
 * the closed set the toolbar currently offers (`all`) is a UI limitation, not a contract — a
 * parser that rejected an unknown id would silently drop a valid deep link the moment that list
 * grows.
 *
 * `series` is the selected chart series — a selection, so `push`: clicking a series in the chart
 * and pressing Back deselects it rather than leaving the page.
 *
 * `range` and `from`/`to` are one value expressed two ways. `range` names a rolling preset and is
 * what the URL carries by default; `from`/`to` carry an explicit UTC span picked from the calendar.
 * **`from`/`to` win when both are present** — an explicit span is never silently re-rolled by a
 * preset that happens to still be in the URL. A preset write clears them; see
 * `use-overview-screen.ts`.
 *
 * `reportOpen`/`period`/`reportGroupBy`/`format`/`include` (phase 4) are the same boolean-target
 * idiom `manageParsers.reportOpen` established (#303/#309): the Export dialog has exactly one
 * possible target (the scoped account/project, already named by `range`/`groupBy` above), so
 * these five params are its whole contract — no separate provider, no dialog-owned draft state.
 * `reportGroupBy` reuses `OVERVIEW_GROUP_BYS` rather than declaring its own union: the report's
 * grouping and the dashboard's are the same vocabulary, and `Export` defaults to whatever the
 * dashboard is currently grouped by (see `use-overview-screen.ts`).
 */
export const overviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  bucket: parseAsStringLiteral(OVERVIEW_BUCKETS).withDefault('day'),
  groupBy: parseAsStringLiteral(OVERVIEW_GROUP_BYS).withDefault('project_id'),
  model: parseAsString.withDefault('all'),
  series: parseAsString.withDefault(''),
  reportOpen: parseAsBoolean.withDefault(false),
  period: reportPeriodParser,
  reportGroupBy: parseAsStringLiteral(OVERVIEW_GROUP_BYS).withDefault('project_id'),
  format: reportFormatParser,
  include: reportIncludeParser,
};

const overviewUrlKeys = {
  groupBy: 'group-by',
  reportOpen: 'report',
  reportGroupBy: 'report-group',
};

export function useOverviewParams() {
  return useQueryStates(overviewParsers, { urlKeys: overviewUrlKeys, history: 'replace' });
}

/** The Overview params that are navigation-grade rather than knobs: selecting a chart series, and
 *  opening/closing the Export dialog — both get their own history entry (mirrors
 *  `MANAGE_SELECTION_OPTIONS`'s `reportOpen` write). */
export const OVERVIEW_SELECTION_OPTIONS = { history: 'push' as const };

// ── /settings/overview/{usage,account,project,user} — IA v3 phase 4 analytics lenses ──────────

/**
 * The range/bucket/selection vocabulary shared by all four analytics lenses under
 * `/settings/overview/*` — the estate overview (`usage`) and the three scope-parameterised lenses
 * (`account`/`project`/`user`, one `use-settings-overview-screen.ts` hook keyed by `lens`).
 *
 * Deliberately the SAME shape `overviewParsers` above declares (`range`/`from`/`to`/`bucket`, the
 * explicit-span-wins-over-preset rule, `resolveOverviewWindow` reused verbatim) rather than a
 * fifth divergent range picker: a reader who already knows what `?range=` and `?from=`/`?to=` mean
 * on `/accounts/<id>/overview` should not have to relearn them here. Declared as its own object
 * (not literally shared by reference with `overviewParsers`) because these lenses have no
 * `groupBy`/report vocabulary of their own — each lens's breakdown dimension is fixed by what it
 * IS (account lens breaks down by model, project lens by api key, …), not a toolbar choice.
 *
 * `series` is the selected ranked-list/chart row — `RankedSeriesRows`' own `selectedKey`, wired
 * the same "URL is the cross-zone state bus" way `overviewParsers.series` already is, `push`-
 * written via `SETTINGS_OVERVIEW_SELECTION_OPTIONS` below.
 *
 * `accountSort` (`/settings/overview/usage` only — build brief §4's "value|delta sort toggle" on
 * the by-account `RankedSeriesRows`) follows the same ledger-sort idiom every other browsable list
 * in this console already uses (`apiKeysParsers.sortKey`, `manageParsers.sortKey`, …): a knob, not
 * a selection, so it writes with `replace` like the rest of this table rather than costing a Back
 * press per toggle.
 */
export const SETTINGS_OVERVIEW_ACCOUNT_SORTS = ['value', 'delta'] as const;

export const settingsOverviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('mtd'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  bucket: parseAsStringLiteral(OVERVIEW_BUCKETS).withDefault('day'),
  series: parseAsString.withDefault(''),
  accountSort: parseAsStringLiteral(SETTINGS_OVERVIEW_ACCOUNT_SORTS).withDefault('value'),
};

const settingsOverviewUrlKeys = { accountSort: 'account-sort' };

export function useSettingsOverviewParams() {
  return useQueryStates(settingsOverviewParsers, {
    urlKeys: settingsOverviewUrlKeys,
    history: 'replace',
  });
}

/** Selecting a ranked-list/chart row is navigation-grade — mirrors `OVERVIEW_SELECTION_OPTIONS`. */
export const SETTINGS_OVERVIEW_SELECTION_OPTIONS = { history: 'push' as const };

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
  overview: { parsers: overviewParsers, urlKeys: overviewUrlKeys },
  settingsOverview: { parsers: settingsOverviewParsers, urlKeys: settingsOverviewUrlKeys },
  apiKeys: { parsers: apiKeysParsers, urlKeys: apiKeysUrlKeys },
  manage: { parsers: manageParsers, urlKeys: manageUrlKeys },
  settings: { parsers: settingsParsers, urlKeys: settingsUrlKeys },
  admin: { parsers: adminParsers, urlKeys: adminUrlKeys },
} as const;
