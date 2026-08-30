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
import type { AdminReviewTab, ReportExportFormat } from '@lightbridge/ui-web';

/**
 * **The console's URL param contract — the single module that owns it (ADR 0011).**
 *
 * Every piece of state that describes *what the user is looking at* lives here, as a typed nuqs
 * parser with a default: scope, dashboard view params, per-route filters and pagination,
 * selections, the active sub-nav tab, and which rail section is open as a sheet. Nothing else in
 * `apps/console` may declare a query param — one module, one writer, one contract.
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

// ── shared: scope ────────────────────────────────────────────────────────────────────────────

/**
 * Account/project scope, read by every route and by all three zones (centre, `@rail`, `@scope`).
 *
 * This is the clearest case of "the URL is the cross-zone state bus" (ADR 0011 Decision 2): the
 * rail's `ScopeSelect` writes it, the centre's ledger filters by it and the left rail's SCOPE echo
 * displays it, and none of the three knows the others exist.
 *
 * An empty `account` does not mean "no account" — it means *"whichever account the data hands me
 * first"*, resolved in `use-console-scope.ts` without ever being written back. That keeps the
 * default out of the URL (rule 1) instead of pinning a shared link to the sender's first account.
 */
export const scopeParsers = {
  accountId: parseAsString.withDefault(''),
  projectId: parseAsString.withDefault(''),
};

const scopeUrlKeys = { accountId: 'account', projectId: 'project' };

/** Scope is a navigation-grade change: Back should return to the previous account/project. */
const scopeOptions = { history: 'push' as const };

export function useScopeParams() {
  return useQueryStates(scopeParsers, { urlKeys: scopeUrlKeys, ...scopeOptions });
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

export const OVERVIEW_RANGES = ['7d', '30d', '90d'] as const;
export const OVERVIEW_BUCKETS = ['hour', 'day', 'week'] as const;
export const OVERVIEW_GROUP_BYS = ['project', 'model'] as const;

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
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('30d'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  bucket: parseAsStringLiteral(OVERVIEW_BUCKETS).withDefault('day'),
  groupBy: parseAsStringLiteral(OVERVIEW_GROUP_BYS).withDefault('project'),
  model: parseAsString.withDefault('all'),
  series: parseAsString.withDefault(''),
  reportOpen: parseAsBoolean.withDefault(false),
  period: reportPeriodParser,
  reportGroupBy: parseAsStringLiteral(OVERVIEW_GROUP_BYS).withDefault('project'),
  format: reportFormatParser,
  include: reportIncludeParser,
};

const overviewUrlKeys = { groupBy: 'group-by', reportOpen: 'report', reportGroupBy: 'report-group' };

export function useOverviewParams() {
  return useQueryStates(overviewParsers, { urlKeys: overviewUrlKeys, history: 'replace' });
}

/** The Overview params that are navigation-grade rather than knobs: selecting a chart series, and
 *  opening/closing the Export dialog — both get their own history entry (mirrors
 *  `MANAGE_SELECTION_OPTIONS`'s `reportOpen` write). */
export const OVERVIEW_SELECTION_OPTIONS = { history: 'push' as const };

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
 * `createOpen` (ticket #303) is the same idea `apiKeysParsers.createOpen` (#319) established:
 * the create-project dialog has exactly one possible target (the scoped account), so a bare
 * boolean is the whole contract. Its draft inputs (name/billing identity/plan) are NOT here —
 * `use-projects-screen.ts`'s own "SANCTIONED LOCAL STATE" comment explains why.
 *
 * `reportOpen` (`?report=`) is shell revamp phase 3's replacement for the deleted right rail's
 * persistent MONTHLY REPORT section: `Monthly report` is now a `PageHeader.action` button that
 * opens `ReportExportDialog`, and the same boolean-target idiom `createOpen` already uses applies
 * — the dialog has exactly one possible target (the scoped account/period), so a bare boolean is
 * the whole contract.
 *
 * What is NO LONGER here: `accountNameOpen` (`?account-name=`). The account naming flow moved to
 * `/settings` along with the panel that opens it, so the param moved with it — see
 * `settingsParsers` below. A `/projects` bookmark carrying `?account-name=true` now simply ignores
 * an unknown param rather than opening a dialog on a screen that no longer mounts one.
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
  createOpen: parseAsBoolean.withDefault(false),
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
  createOpen: 'create',
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
 * page we're filtering"). It stays ONE param and not two even though the dialog drives two
 * different procedures (`createAccount` / `updateAccountName`), because which one it drives is not
 * a choice the user makes — it is derived from whether the signed-in subject already holds an
 * account. Putting a `mode` in the URL would let a link assert a mode the data contradicts. The
 * wire key stays `account-name`, deliberately distinct from scope's own `account` (which carries
 * an id, not a flag).
 *
 * `renameProjectId` (`?rename=<project id>`) carries an ID rather than a boolean, which is the one
 * structural difference from every other dialog param in this module: the account dialog has
 * exactly one possible target (the signed-in subject), while a rename has as many targets as the
 * account has projects. A boolean would have to be paired with a separate "which row" param — two
 * params that can contradict each other — so the id IS the open flag, exactly the way
 * `apiKeysParsers.revokeKeyId` already works.
 *
 * Both write with `push` (`SETTINGS_DIALOG_OPTIONS`): opening a dialog that is about to perform a
 * write is navigation, and Back must close it rather than leave the screen. The typed-but-unsent
 * names in either dialog are NOT here — see `use-settings-screen.ts`'s own "SANCTIONED LOCAL
 * STATE" comment for why a draft must never reach the URL or browser history.
 */
export const settingsParsers = {
  accountNameOpen: parseAsBoolean.withDefault(false),
  renameProjectId: parseAsString.withDefault(''),
};

const settingsUrlKeys = { accountNameOpen: 'account-name', renameProjectId: 'rename' };

export function useSettingsParams() {
  return useQueryStates(settingsParsers, { urlKeys: settingsUrlKeys, history: 'replace' });
}

/** Opening or closing either dialog is navigation-grade: Back closes it, it does not leave. */
export const SETTINGS_DIALOG_OPTIONS = { history: 'push' as const };

// ── /admin ───────────────────────────────────────────────────────────────────────────────────

export const ADMIN_REVIEW_TABS = [
  'pending',
  'decided',
] as const satisfies readonly AdminReviewTab[];

/**
 * `/admin`'s params: the review queue's tab and its selected request.
 *
 * Phase 4 (2026-08-30) deletes `/admin`'s own dashboard section: the operator queries it used to
 * carry (`?section=`, and the `range`/`from`/`to`/`bucket`/`group-by`/`series` knobs mirrored from
 * `overviewParsers`) moved to `/` itself, gated behind `session.isAdmin` — see
 * `use-overview-screen.ts`'s admin-only block. `/admin` is now ONE screen, the budget refill
 * review queue, so it needs no sub-nav param at all; `tab`/`selectedRequestId` are what remain.
 *
 * Both write with `push` (ADR 0011 rule 2): the review tab is this screen's own sub-nav, and a
 * selected request is a selection — Back returns to the tab, or deselects the request.
 */
export const adminParsers = {
  tab: parseAsStringLiteral(ADMIN_REVIEW_TABS).withDefault('pending'),
  selectedRequestId: parseAsString.withDefault(''),
};

const adminUrlKeys = { selectedRequestId: 'request' };

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
  scope: { parsers: scopeParsers, urlKeys: scopeUrlKeys },
  overview: { parsers: overviewParsers, urlKeys: overviewUrlKeys },
  apiKeys: { parsers: apiKeysParsers, urlKeys: apiKeysUrlKeys },
  manage: { parsers: manageParsers, urlKeys: manageUrlKeys },
  settings: { parsers: settingsParsers, urlKeys: settingsUrlKeys },
  admin: { parsers: adminParsers, urlKeys: adminUrlKeys },
} as const;
