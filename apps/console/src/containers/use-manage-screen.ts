'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type {
  ManageFiltersRailProps,
  ManageReportRailProps,
  ManageTotals,
  PlaceholderNotice,
  ProjectRow,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import {
  MANAGE_BUDGET_STATES,
  MANAGE_REPORT_GROUP_BYS,
  MANAGE_SELECTION_OPTIONS,
  MANAGE_STATUSES,
  REPORT_FORMATS,
  REPORT_INCLUDE_IDS,
  useManageParams,
  type ReportIncludeId,
} from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { manageTotals, toProjectRows } from './project-rows';

/**
 * `/manage` — the screen's data adapter, shared by its centre (`page.tsx`), its rail
 * (`@rail/manage/page.tsx`) and its left-rail sub-nav (`@scope/manage/page.tsx`).
 *
 * All three read the same query params (ADR 0011), so the rail's FILTERS/SELECTION sections and
 * the centre's ledger cannot disagree; the identical `useList` key means one request, not three.
 * A configured ledger — `?q=alpha&status=active&budget-state=no-quota&row=proj_7` — is a link.
 */

const PAGE_SIZE = 25;

/**
 * Matches `USAGE_PENDING_MESSAGE` (`use-overview-screen.ts`)'s pattern: an inline status line
 * naming exactly what is missing, rather than a subline that quietly asserts something the screen
 * has never fetched (issue #271 — the old `subline="spend shown month-to-date"` was that claim).
 *
 * Console-ui#326: no "(ADR 0009 follow-ups N)" citation — follow-up 4 (the `apps/console`
 * scaffold) shipped, so citing it here was simply wrong, and an internal ADR follow-up index is
 * not something this self-service console's own customers should have to decode. State the fact
 * plainly instead; see the PR body for the full argument against citing follow-up numbers in
 * user-visible copy.
 */
export const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are unwired: no usage-backend query client yet. Project status and quota tier below are live.';

const STATUS_LABELS: Record<(typeof MANAGE_STATUSES)[number], string> = {
  all: 'All',
  active: 'Active',
  suspended: 'Suspended',
};

const BUDGET_STATE_LABELS: Record<(typeof MANAGE_BUDGET_STATES)[number], string> = {
  all: 'Any budget state',
  'quota-set': 'Quota set',
  'no-quota': 'No quota',
};

const GROUP_BY_LABELS: Record<(typeof MANAGE_REPORT_GROUP_BYS)[number], string> = {
  project: 'Project',
  model: 'Model',
};

const INCLUDE_LABELS: Record<ReportIncludeId, string> = {
  totals: 'Totals row',
  'per-model': 'Per-model breakdown',
};

// Options derive from the URL contract's literal unions: a value the rail can offer but the parser
// would reject is exactly the drift ADR 0011 makes the contract module responsible for preventing.
const STATUS_OPTIONS: SegmentedOption<string>[] = MANAGE_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const BUDGET_STATE_OPTIONS = MANAGE_BUDGET_STATES.map((value) => ({
  value,
  label: BUDGET_STATE_LABELS[value],
}));

const GROUP_BY_OPTIONS: SegmentedOption<string>[] = MANAGE_REPORT_GROUP_BYS.map((value) => ({
  value,
  label: GROUP_BY_LABELS[value],
}));

/**
 * `/api/reports/consumption`, the CSV export route this needs, doesn't exist yet — tracked
 * separately as `#308` (Epic 4), not cited here (console-ui#326: an internal ticket number is not
 * something this self-service console's own customers should have to decode, and the ADR 0009
 * Decision 8 citation this string used to carry named a design decision, not the missing route
 * itself). Rather than ship a button that silently does nothing, this states plainly why nothing
 * happened.
 */
export const REPORT_EXPORT_PENDING = "Report export isn't available yet.";

/**
 * The project-creation form doesn't exist yet — tracked separately as `#303` (Epic 4). Console-
 * ui#326: this string used to cite "ADR 0009 follow-up 3," which is the component-library
 * follow-up and had already shipped — a customer-visible string citing a shipped item as the
 * reason a feature is missing is simply wrong, on top of being internal-tracker jargon a
 * self-service console's own customers shouldn't have to decode.
 */
export const NEW_PROJECT_PENDING = "Project creation isn't available yet.";

/**
 * The two unwired actions are modelled as **mutations that fail with the reason**, not as a
 * `notice` string someone has to own.
 *
 * That is not a trick to dodge `useState`: it is what they are. Each is an attempt to perform a
 * server-side action that does not exist yet, and the report action can be fired from either zone
 * (the report panel is mounted twice — the rail at `lg`, the centre's report sheet below it), so
 * its outcome has to be visible regardless of which copy was pressed. Routing them through the
 * shared `MutationCache` gives exactly that. The message must not enter the URL — it is not view
 * state.
 *
 * console-ui#325: **neither outcome is an error.** Nothing failed and there is nothing to retry,
 * so `errorMessage` (below) never folds these in any more — it is reserved for a genuine failed
 * projects fetch, the only case `ManageProjectsLedger` renders through `ErrorLine`
 * (`role="alert"`, `Retry`). Each mutation's outcome instead surfaces as a `PlaceholderNotice`
 * (`newProjectNotice` / `report.notice`), rendered through `InlineStatus` — no alert role, no
 * signal colour, `Dismiss` rather than `Retry`, matching the "unwired" vocabulary
 * `UNWIRED_CHART_MESSAGE` already established for Overview's charts (console-ui#336) instead of
 * inventing a second one.
 */
const NEW_PROJECT_MUTATION_KEY = ['manage', 'new-project'];
const REPORT_MUTATION_KEY = ['manage', 'report'];

export interface ManageScreen {
  rows: ProjectRow[];
  loading: boolean;
  /** A genuine failed projects fetch — the only case rendered through `ErrorLine`. Never the
   *  `newProject`/`report.onGenerate` placeholder outcomes (console-ui#325); see their own
   *  `newProjectNotice`/`report.notice` fields. */
  errorMessage: string | undefined;
  /** Matches `useOverviewScreen`'s `emptyMessage` — an always-visible inline status line naming
   *  exactly what is unwired (issue #271), never folded into `ScreenHeading`'s `subline`. */
  spendPendingMessage: string;
  totals: ManageTotals;
  retry: () => void;
  search: string;
  setSearch: (value: string) => void;
  newProject: () => void;
  /** Set after `newProject()` is pressed — project creation isn't wired yet. A non-alert notice,
   *  never an `ErrorLine` (console-ui#325). */
  newProjectNotice: PlaceholderNotice | undefined;
  selectedProject: ProjectRow | null;
  selectRow: (row: ProjectRow) => void;
  projectCount: number;
  pagination: {
    shown: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  filters: ManageFiltersRailProps;
  report: ManageReportRailProps;
}

/**
 * `scopeSlot` is passed in rather than built here because `ReportExportPanel` renders it as-is and
 * the panel does not own account/project scope — a `ScopeSelect` does. Both callers pass the same
 * element.
 */
export function useManageScreen(scopeSlot: ReactNode): ManageScreen {
  const scope = useConsoleScope();
  const [view, setView] = useManageParams();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.accountId) {
      active.push({ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId });
    }
    if (view.status !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: view.status });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.accountId, view.status, view.search]);

  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'name', order: 'asc' }],
  });

  const projects = list.result.data;
  const total = list.result.total ?? projects.length;

  // Re-based on whether a governance quota tier is actually assigned (issue #269) — the previous
  // `ceiling !== null` check was always false (every `projectQuota` tier id fails `Number()`), so
  // "Quota set" returned zero rows and "No quota" returned everything, regardless of the real tier.
  const rows = useMemo(() => {
    const mapped = toProjectRows(projects);
    if (view.budgetState === 'quota-set') return mapped.filter((row) => row.quotaTier !== null);
    if (view.budgetState === 'no-quota') return mapped.filter((row) => row.quotaTier === null);
    return mapped;
  }, [projects, view.budgetState]);

  const newProjectAction = useSharedMutation<void, never>({
    mutationKey: NEW_PROJECT_MUTATION_KEY,
    mutationFn: async () => {
      throw new Error(NEW_PROJECT_PENDING);
    },
  });

  const reportAction = useSharedMutation<void, never>({
    mutationKey: REPORT_MUTATION_KEY,
    mutationFn: async () => {
      throw new Error(REPORT_EXPORT_PENDING);
    },
  });

  // Retries the genuine failed fetch only — the two placeholder notices are dismissed by their
  // own `Dismiss` action, not bundled into the unrelated list-error `Retry` (console-ui#325: an
  // active "project creation isn't available" notice must not vanish just because the list's
  // Retry happened to be pressed).
  const refresh = () => {
    void list.query.refetch();
  };

  // The SELECTION rail's subject is `?row=<id>`, looked up in the loaded page — so a link to a
  // selected project reopens on that project, and Back deselects instead of leaving `/manage`.
  const selectedProject = rows.find((row) => row.id === view.selectedProjectId) ?? null;

  return {
    rows,
    loading: list.query.isLoading,
    // Real failures only (console-ui#325) — `newProjectAction`/`reportAction`'s outcomes are
    // deliberate, never-built placeholders, surfaced below as `PlaceholderNotice`s instead.
    errorMessage: list.query.isError ? 'Could not load projects.' : undefined,
    spendPendingMessage: MANAGE_SPEND_PENDING_MESSAGE,
    totals: manageTotals(rows, total),
    retry: refresh,
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
    newProject: () => newProjectAction.mutate(undefined),
    newProjectNotice: newProjectAction.errorMessage
      ? { message: newProjectAction.errorMessage, onDismiss: newProjectAction.dismiss }
      : undefined,
    selectedProject,
    selectRow: (row) => {
      void setView({ selectedProjectId: row.id }, MANAGE_SELECTION_OPTIONS);
    },
    projectCount: total,
    pagination: {
      shown: rows.length,
      total,
      hasPrev: view.page > 1,
      hasNext: view.page * PAGE_SIZE < total,
      onPrev: () => {
        void setView({ page: Math.max(1, view.page - 1) });
      },
      onNext: () => {
        void setView({ page: view.page + 1 });
      },
    },
    filters: {
      accountValue: scope.value.accountId,
      accountOptions: scope.accounts.map((account) => ({
        value: account.id,
        label: account.label,
      })),
      onAccountChange: (accountId) => {
        scope.setValue({ accountId, projectId: null });
        // Same tick as the scope write, so nuqs coalesces both into one history entry.
        void setView({ page: 1 }, { history: 'push' });
      },
      statusOptions: STATUS_OPTIONS,
      statusValue: view.status,
      onStatusChange: (status) => {
        void setView({ status: status as (typeof MANAGE_STATUSES)[number], page: 1 });
      },
      budgetStateValue: view.budgetState,
      budgetStateOptions: BUDGET_STATE_OPTIONS,
      onBudgetStateChange: (budgetState) => {
        void setView({ budgetState: budgetState as (typeof MANAGE_BUDGET_STATES)[number] });
      },
    },
    report: {
      period: view.period,
      onPeriodChange: (period) => {
        void setView({ period });
      },
      scopeSlot,
      groupByOptions: GROUP_BY_OPTIONS,
      groupBy: view.reportGroupBy,
      onGroupByChange: (reportGroupBy) => {
        void setView({
          reportGroupBy: reportGroupBy as (typeof MANAGE_REPORT_GROUP_BYS)[number],
        });
      },
      includeToggles: REPORT_INCLUDE_IDS.map((id) => ({
        id,
        label: INCLUDE_LABELS[id],
        checked: view.include.includes(id),
      })),
      onToggleInclude: (id, checked) => {
        const next = REPORT_INCLUDE_IDS.filter((candidate) =>
          candidate === id ? checked : view.include.includes(candidate)
        );
        void setView({ include: next });
      },
      format: view.format,
      onFormatChange: (format) => {
        void setView({ format: format as (typeof REPORT_FORMATS)[number] });
      },
      onGenerate: () => reportAction.mutate(undefined),
      generating: reportAction.isPending,
      notice: reportAction.errorMessage
        ? { message: reportAction.errorMessage, onDismiss: reportAction.dismiss }
        : undefined,
      // `[]`, not fetched from anywhere: report generation isn't wired, so there is no export
      // history to have — `ReportExportPanel` renders "Export history is unwired." for this
      // case, never "No exports yet." (console-ui#326 — that phrasing implied an export had been
      // attempted and simply never checked).
      lastExports: [],
    },
  };
}
