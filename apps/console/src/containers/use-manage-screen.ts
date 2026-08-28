'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type {
  ManageFiltersRailProps,
  ManageReportRailProps,
  ManageTotals,
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
 */
export const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are unwired: no usage-backend query client yet (ADR 0009 follow-ups 4 and 6). Project status and quota tier below are live.';

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
 * ADR 0009 Decision 8's `/api/reports/consumption` CSV route is a separate follow-up (the ADR's
 * own follow-up list, item 6) and reads from the usage backend. Rather than ship a button that
 * silently does nothing, this states plainly why nothing happened, in the screen's own inline
 * error line.
 */
const REPORT_EXPORT_PENDING =
  'Report export needs the consumption report route (ADR 0009 Decision 8), which is not wired yet.';

const NEW_PROJECT_PENDING =
  'Project creation arrives with the project form (ADR 0009 follow-up 3).';

/**
 * The two unwired actions are modelled as **mutations that fail with the reason**, not as a
 * `notice` string someone has to own.
 *
 * That is not a trick to dodge `useState`: it is what they are. Each is an attempt to perform a
 * server-side action that does not exist yet, each can be fired from either zone (the report
 * panel is mounted twice — the rail at `lg`, the centre's report sheet below it), and the message
 * has to appear on the centre's ledger error line regardless of which copy was pressed. Routing
 * them through the shared `MutationCache` gives exactly that, and they disappear on retry like
 * every other failure. The message must not enter the URL — an error is not view state.
 */
const NEW_PROJECT_MUTATION_KEY = ['manage', 'new-project'];
const REPORT_MUTATION_KEY = ['manage', 'report'];

export interface ManageScreen {
  rows: ProjectRow[];
  loading: boolean;
  errorMessage: string | undefined;
  /** Matches `useOverviewScreen`'s `emptyMessage` — an always-visible inline status line naming
   *  exactly what is unwired (issue #271), never folded into `ScreenHeading`'s `subline`. */
  spendPendingMessage: string;
  totals: ManageTotals;
  retry: () => void;
  search: string;
  setSearch: (value: string) => void;
  newProject: () => void;
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

  const refresh = () => {
    newProjectAction.dismiss();
    reportAction.dismiss();
    void list.query.refetch();
  };

  // The SELECTION rail's subject is `?row=<id>`, looked up in the loaded page — so a link to a
  // selected project reopens on that project, and Back deselects instead of leaving `/manage`.
  const selectedProject = rows.find((row) => row.id === view.selectedProjectId) ?? null;

  return {
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError
      ? 'Could not load projects.'
      : (newProjectAction.errorMessage ?? reportAction.errorMessage),
    spendPendingMessage: MANAGE_SPEND_PENDING_MESSAGE,
    totals: manageTotals(rows, total),
    retry: refresh,
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
    newProject: () => newProjectAction.mutate(undefined),
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
      lastExports: [],
    },
  };
}
