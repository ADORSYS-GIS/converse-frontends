'use client';

import {
  debounce,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
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

// ── shared: which rail section is open as a sheet ────────────────────────────────────────────

/**
 * Below `lg` the right rail is not rendered and each of its sections is reached through a
 * contextual trigger that opens *that one section* as a `SectionSheet`. Which one is open is view
 * state — it is part of what the user is looking at, and a link to `?sheet=filters` opens the
 * screen with its filter parameters already in front of the recipient.
 *
 * One param for the whole console, not one per route: only one sheet can be open at a time, and
 * the ids are the rail-section vocabulary the trigger glyphs already use.
 *
 * `history: 'replace'` — opening and closing a sheet is knob-twiddling, not navigation, and the
 * sheet's own dismiss gestures (backdrop, Escape) would otherwise each cost a history entry.
 */
export const SECTION_SHEET_IDS = ['view', 'filters', 'export', 'scope', 'report'] as const;
export type SectionSheetId = (typeof SECTION_SHEET_IDS)[number];

export function useSectionSheetParam() {
  return useQueryState(
    'sheet',
    parseAsStringLiteral(SECTION_SHEET_IDS).withOptions({ history: 'replace' })
  );
}

// ── / (overview) ─────────────────────────────────────────────────────────────────────────────

export const OVERVIEW_RANGES = ['7d', '30d', '90d'] as const;
export const OVERVIEW_BUCKETS = ['hour', 'day', 'week'] as const;
export const OVERVIEW_GROUP_BYS = ['project', 'model'] as const;

/**
 * The Overview dashboard's view params.
 *
 * `model` is a plain string rather than a literal union: model ids come from the usage backend, so
 * the closed set the rail currently offers (`all`) is a UI limitation, not a contract — a parser
 * that rejected an unknown id would silently drop a valid deep link the moment that list grows.
 *
 * `series` is the selected chart series — a selection, so `push`: clicking a series in the chart
 * and pressing Back deselects it rather than leaving the page.
 */
export const overviewParsers = {
  range: parseAsStringLiteral(OVERVIEW_RANGES).withDefault('30d'),
  bucket: parseAsStringLiteral(OVERVIEW_BUCKETS).withDefault('day'),
  groupBy: parseAsStringLiteral(OVERVIEW_GROUP_BYS).withDefault('project'),
  model: parseAsString.withDefault('all'),
  series: parseAsString.withDefault(''),
};

const overviewUrlKeys = { groupBy: 'group-by' };

export function useOverviewParams() {
  return useQueryStates(overviewParsers, { urlKeys: overviewUrlKeys, history: 'replace' });
}

/** The one Overview param that is a selection rather than a knob, so it gets its own history entry. */
export const OVERVIEW_SELECTION_OPTIONS = { history: 'push' as const };

// ── /api-keys ────────────────────────────────────────────────────────────────────────────────

export const API_KEY_STATUSES = ['all', 'active', 'revoked'] as const;

/**
 * `q` is the ledger's free-text name filter, debounced onto the URL: the input stays responsive
 * per keystroke while the address bar (and the refine query it drives) settles once typing stops.
 *
 * `revoke` holds the id of the key whose revoke confirmation is open, and `delete` the same for
 * the (admin-gated, ticket #321) delete confirmation. A dialog *target* is view state — Back
 * closes the dialog, and a colleague can be sent straight to the confirmation. Neither dialog's
 * failure reason is here: it belongs to the mutation that failed.
 */
export const apiKeysParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(API_KEY_STATUSES).withDefault('all'),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  selectedKeyId: parseAsString.withDefault(''),
  revokeKeyId: parseAsString.withDefault(''),
  deleteKeyId: parseAsString.withDefault(''),
};

const apiKeysUrlKeys = {
  search: 'q',
  selectedKeyId: 'key',
  revokeKeyId: 'revoke',
  deleteKeyId: 'delete',
};

export function useApiKeysParams() {
  return useQueryStates(apiKeysParsers, { urlKeys: apiKeysUrlKeys, history: 'replace' });
}

/** Row selection and the revoke/delete dialogs are navigation-grade; the filters above them are not. */
export const API_KEYS_SELECTION_OPTIONS = { history: 'push' as const };

// ── /manage ──────────────────────────────────────────────────────────────────────────────────

// `active | suspended` are the only two values `Project.status` ever holds (authz.cstack:274-277,
// 699-700 — mutated only by `disableProject`/`enableProject`). `archived` never existed on the
// backend (issue #268); a bookmarked `?status=archived` link now falls back to nuqs's `all`
// default rather than silently matching zero rows forever.
export const MANAGE_STATUSES = ['all', 'active', 'suspended'] as const;
export const MANAGE_BUDGET_STATES = ['all', 'quota-set', 'no-quota'] as const;
export const MANAGE_REPORT_GROUP_BYS = ['project', 'model'] as const;
export const REPORT_FORMATS = ['csv', 'pdf'] as const satisfies readonly ReportExportFormat[];
export const REPORT_INCLUDE_IDS = ['totals', 'per-model'] as const;
export type ReportIncludeId = (typeof REPORT_INCLUDE_IDS)[number];

/**
 * The month the monthly report defaults to, resolved **once at module load** rather than per
 * render — reading the clock during render makes output depend on when React happens to re-render.
 *
 * It is a moving default by design: because it is the default, `clearOnDefault` keeps it out of
 * the URL, so a shared link without `?period=` means "the current month" for whoever opens it,
 * while a link to a *specific* month carries `?period=2026-07` explicitly.
 */
export const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

/**
 * `include` is a set, so it is a comma-separated array param (`?include=totals,per-model`) rather
 * than one boolean param per toggle — the URL stays legible and a new toggle costs no new param.
 * `parseAsArrayOf` compares by value, so the default set still clears itself out of the URL.
 */
export const manageParsers = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault('').withOptions({ limitUrlUpdates: debounce(400) }),
  status: parseAsStringLiteral(MANAGE_STATUSES).withDefault('all'),
  budgetState: parseAsStringLiteral(MANAGE_BUDGET_STATES).withDefault('all'),
  selectedProjectId: parseAsString.withDefault(''),
  period: parseAsString.withDefault(CURRENT_PERIOD),
  reportGroupBy: parseAsStringLiteral(MANAGE_REPORT_GROUP_BYS).withDefault('project'),
  format: parseAsStringLiteral(REPORT_FORMATS).withDefault('csv'),
  include: parseAsArrayOf(parseAsStringLiteral(REPORT_INCLUDE_IDS)).withDefault([
    'totals',
  ] as ReportIncludeId[]),
};

const manageUrlKeys = {
  search: 'q',
  budgetState: 'budget-state',
  selectedProjectId: 'row',
  reportGroupBy: 'report-group',
};

export function useManageParams() {
  return useQueryStates(manageParsers, { urlKeys: manageUrlKeys, history: 'replace' });
}

/** Picking a project row retargets the SELECTION rail — a view change worth a Back press. */
export const MANAGE_SELECTION_OPTIONS = { history: 'push' as const };

// ── /admin ───────────────────────────────────────────────────────────────────────────────────

export const ADMIN_REVIEW_TABS = [
  'pending',
  'decided',
] as const satisfies readonly AdminReviewTab[];

/**
 * The review queue's active tab and selected request.
 *
 * Both are `push`: the tab is this screen's sub-nav (ADR 0011 Decision 1 names "active sub-nav
 * tab" explicitly), and selecting a request is what fills the review rail — a reviewer who opens
 * the wrong request expects Back to return to the queue, not to leave `/admin`.
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
  admin: { parsers: adminParsers, urlKeys: adminUrlKeys },
} as const;
