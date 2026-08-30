'use client';

import type { BillingPlanInfo, Project } from '@lightbridge/authz-rpc';
import { createId } from '@lightbridge/authz-rpc';
import type {
  CreateProjectDialogProps,
  LedgerSort,
  ManageControlsProps,
  ProjectRow,
  ReportExportDialogProps,
  ReportExportParams,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import {
  MANAGE_BUDGET_STATES,
  MANAGE_REPORT_GROUP_BYS,
  MANAGE_SELECTION_OPTIONS,
  MANAGE_STATUSES,
  PROJECTS_SORT_KEYS,
  REPORT_FORMATS,
  REPORT_INCLUDE_IDS,
  useManageParams,
  type ReportIncludeId,
} from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import { buildBudgetConsumptionByProjectRequest } from './overview-usage';
import { buildCreateProjectInput } from './build-create-project-input';
import { classifyCreateProjectError } from './rpc-field-error';
import { downloadBlob, filenameFromContentDisposition } from './download-file';
import { applyProjectSpend, sortProjectRows, toProjectRows } from './project-rows';

/**
 * `/projects` (renamed from `/manage`, 2026-08-30 revamp brief) — the screen's data adapter.
 * `ProjectsCentre` is the one zone that reads it (shell revamp phase 2 deleted the `@rail`/
 * `@scope` parallel-route slots this used to be shared with; phase 3 deleted the right-hand aside
 * those slots had been temporarily replaced by).
 *
 * View state is the URL (ADR 0011): a configured ledger —
 * `?q=alpha&status=active&budget-state=no-quota&row=proj_7&sort=spendMtd&dir=desc` — is a link.
 */

const PAGE_SIZE = 25;

/** Same billing-period window `use-overview-screen.ts`'s budget-pressure zone uses — see
 *  `overview-usage.ts`'s `currentPeriodRange` for why it is always "this calendar month," never
 *  the dashboard's own 7d/30d/90d range. */
const SPEND_QUERY_KEY_PERIOD = new Date().toISOString().slice(0, 7);

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
 * Module-level so `Generate report`'s outcome is visible wherever it is read from, the same
 * `useSharedMutation` idiom every mutation in this file follows for consistency — even though
 * `ReportExportDialog` now mounts exactly once (shell revamp phase 3: it used to mount twice, in
 * the persistent rail and the centre's compact-tier sheet, both gone).
 */
const NEW_PROJECT_MUTATION_KEY = ['projects', 'new-project'];
const REPORT_MUTATION_KEY = ['projects', 'report'];
const PROJECT_BILLING_PLANS_QUERY_KEY = ['projects', 'billingPlans'];

type CreateProjectDraft = {
  name: string;
  billingIdentity: string;
  planId: string | null;
};

function emptyProjectDraft(): CreateProjectDraft {
  return { name: '', billingIdentity: '', planId: null };
}

export interface ProjectsScreen {
  /** The scoped account's display label (`accountScopeLabel`) — for `PageHeader.subtitle`, never
   *  a second, driftable computation at the call site. `undefined` before an account resolves. */
  scopeLabel: string | undefined;
  rows: ProjectRow[];
  loading: boolean;
  /** A genuine failed projects fetch — the only case rendered through `ErrorLine`. */
  errorMessage: string | undefined;
  retry: () => void;
  search: string;
  setSearch: (value: string) => void;
  /** `true` when a search term or a non-default status/budget-state filter is narrowing the
   *  list — decides which empty state `ProjectsCentre` renders (`EmptyState` vs an inline
   *  "no matches" line, same "empty collection vs empty result" split `ProjectsLedger`'s own doc
   *  comment draws). */
  filtersActive: boolean;
  /** Opens `CreateProjectDialog` — a no-op while `createProjectEligible` is false. */
  newProject: () => void;
  /**
   * Presentation-only mirror of `model.Project.create`'s owner-only `@@allow` gate
   * (`authz.cstack:274` — `account.id == auth().id`). This console models one account per
   * signed-in principal (ADR-0006 "a person's defining identity is their `accountId`" — an
   * account IS the person, not an org with members), so "owner" here means the scoped account is
   * literally the signed-in principal, never an account this person merely has project membership
   * in. `false` whenever ownership cannot be confirmed, never defaulted to `true` — same
   * disclaimer as `createKeyEligible` in `use-api-keys-screen.ts`:
   * `lightbridge-authz`'s hand-written RBAC check is the actual enforcement
   * (`packages/hooks/src/rbac.ts` documents the same pattern for the coarser role grants), this is
   * presentation only.
   */
  createProjectEligible: boolean;
  /** Stated beside the disabled `+ New project` control; `undefined` exactly when eligible. */
  createProjectReason: string | undefined;
  createProjectDialog: CreateProjectDialogProps;
  selectedProject: ProjectRow | null;
  selectRow: (row: ProjectRow) => void;
  /** Closes `DetailSheet` — clears `?row=` (shell revamp phase 3: replaces the deleted right
   *  rail's SELECTION section). */
  clearSelection: () => void;
  projectCount: number;
  sort: LedgerSort;
  onSortChange: (sort: LedgerSort) => void;
  pagination: {
    shown: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  /** `ManageControls` — the table-scoped account/status/budget-state filter cluster, rendered in
   *  `ProjectsLedger`'s own toolbar now (2026-08-30: moved off `PageHeader.controls`, where phase
   *  3 had put it, alongside the ledger's own search field). */
  filters: Omit<ManageControlsProps, 'className'>;
  /** `ReportExportDialog` — opened from the `Monthly report` button in `PageHeader.action`
   *  (shell revamp phase 3: replaces the deleted right rail's MONTHLY REPORT section). */
  report: ReportExportDialogProps;
}

/**
 * `scopeSlot` is passed in rather than built here because `ReportExportPanel` renders it as-is and
 * the panel does not own account/project scope — a `ScopeSelect` does. Both callers pass the same
 * element.
 */
export function useProjectsScreen(scopeSlot: ReactNode): ProjectsScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
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

  // No `sorters` here any more: `name` and `spendMtd` are both sorted CLIENT-SIDE, over this one
  // page, below — see `sortProjectRows`'s own doc comment for why splitting one backend-sortable
  // column from one that is not (spend lives in an entirely separate usage-backend query) into
  // two different sort mechanisms was worse than sorting both the same way.
  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
  });

  const projects = list.result.data;
  const total = list.result.total ?? projects.length;

  // ── Spend MTD (2026-08-30 revamp brief): the same account-wide, current-billing-period,
  // per-project consumption query `use-overview-screen.ts`'s admin budget-pressure zone already
  // ships (`buildBudgetConsumptionByProjectRequest` + `queryUsage`) — reused verbatim rather than
  // re-derived, so the two screens can never disagree about what "this period's spend" means. ──
  const accountId = scope.value.accountId;
  const spendQuery = useQuery({
    queryKey: ['projects', 'spend-by-project', accountId, SPEND_QUERY_KEY_PERIOD],
    queryFn: () => queryUsage(buildBudgetConsumptionByProjectRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });
  const spendStatus: 'loading' | 'ready' | 'error' = spendQuery.isError
    ? 'error'
    : spendQuery.isPending
      ? 'loading'
      : 'ready';

  // Re-based on whether a governance quota tier is actually assigned (issue #269) — the previous
  // `ceiling !== null` check was always false (every `projectQuota` tier id fails `Number()`), so
  // "Quota set" returned zero rows and "No quota" returned everything, regardless of the real tier.
  const rows = useMemo(() => {
    const mapped = toProjectRows(projects);
    const withBudgetFilter =
      view.budgetState === 'quota-set'
        ? mapped.filter((row) => row.quotaTier !== null)
        : view.budgetState === 'no-quota'
          ? mapped.filter((row) => row.quotaTier === null)
          : mapped;
    const withSpend = applyProjectSpend(withBudgetFilter, spendQuery.data, spendStatus);
    return sortProjectRows(withSpend, { key: view.sortKey, direction: view.sortDirection });
  }, [projects, view.budgetState, view.sortKey, view.sortDirection, spendQuery.data, spendStatus]);

  // Retries the genuine failed fetch AND refreshes the ledger after a real create — declared
  // ahead of the mutations below so their `onSuccess` closures can reference it.
  const refresh = () => {
    void list.query.refetch();
  };

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the create-project dialog's typed-but-unsent name/billing
   * identity/plan. Same shape as `use-api-keys-screen.ts`'s create-key draft (ticket #319):
   * `createOpen` — WHETHER the dialog is showing — is real view state and lives in the URL
   * (`?create=1`, `url-state.ts`); this is its CONTENTS, which are not, for the same reason —
   * typed prose ahead of a submit, discarded either way, and `?create=1&name=widgets-prod` would
   * write every keystroke into browser history and into any link copied from the address bar.
   * `CreateProjectDialog` mounts in exactly one zone (the centre, same as `CreateApiKeyDialog`),
   * so a per-instance draft cannot desynchronise across zones.
   */
  const [projectDraft, setProjectDraft] = useState<CreateProjectDraft>(emptyProjectDraft);
  const resetProjectDraft = () => setProjectDraft(emptyProjectDraft());

  // The real billing-plan catalogue (same procedure `use-api-keys-screen.ts` uses for the same
  // reason) — never a hardcoded plan id.
  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: PROJECT_BILLING_PLANS_QUERY_KEY,
    queryFn: () => client.procedures.listBillingPlans({ args: {} }),
  });
  const plans = plansQuery.data ?? [];
  const resolvedPlanId = projectDraft.planId ?? plans[0]?.id ?? null;

  // Owner-only gate mirror — see `ProjectsScreen.createProjectEligible`'s own doc comment for why
  // this checks against the signed-in principal rather than a roster.
  let createProjectEligible: boolean;
  let createProjectReason: string | undefined;
  if (!scope.value.accountId) {
    createProjectEligible = false;
    createProjectReason = 'Select an account to create a project.';
  } else if (!session.user) {
    createProjectEligible = false;
    createProjectReason = 'Sign in to create a project.';
  } else if (session.user.sub !== scope.value.accountId) {
    createProjectEligible = false;
    createProjectReason = 'Only the account owner can create a project.';
  } else {
    createProjectEligible = true;
    createProjectReason = undefined;
  }

  const newProjectAction = useSharedMutation<void, Project>({
    mutationKey: NEW_PROJECT_MUTATION_KEY,
    mutationFn: async () => {
      // Guards, not UI branches: `canSubmitCreateProject` (below) already keeps the dialog's own
      // primary disabled in every one of these cases — this only fires against a caller bypassing
      // the dialog entirely, same idiom `use-api-keys-screen.ts`'s `secret` mutation uses.
      if (!scope.value.accountId) {
        throw new Error('Select an account before creating a project.');
      }
      if (!projectDraft.name.trim()) {
        throw new Error('Name the project before creating it.');
      }
      if (!projectDraft.billingIdentity.trim()) {
        throw new Error('Give the project a billing identity before creating it.');
      }
      if (!resolvedPlanId) {
        throw new Error('Choose a billing plan before creating a project.');
      }
      return client.projects.create(
        buildCreateProjectInput({
          id: createId(),
          accountId: scope.value.accountId,
          name: projectDraft.name.trim(),
          billingIdentity: projectDraft.billingIdentity.trim(),
          billingPlan: resolvedPlanId,
        })
      );
    },
    onSuccess: () => {
      refresh();
      resetProjectDraft();
      void setView({ createOpen: false }, MANAGE_SELECTION_OPTIONS);
    },
  });

  // `getApiErrorMessage` already ran inside `useSharedMutation` (see its own doc comment) — this
  // routes the CLEAN decoded message onto the field it actually names, or a general line when it
  // names neither (`classifyCreateProjectError`'s own doc comment).
  const createProjectFieldErrors = newProjectAction.errorMessage
    ? classifyCreateProjectError(newProjectAction.errorMessage)
    : {};

  const canSubmitCreateProject =
    projectDraft.name.trim().length > 0 &&
    projectDraft.billingIdentity.trim().length > 0 &&
    resolvedPlanId !== null &&
    !plansQuery.isLoading &&
    !plansQuery.isError;

  const createProjectDialog: CreateProjectDialogProps = {
    open: view.createOpen,
    accountLabel: scope.value.accountId || '—',
    name: projectDraft.name,
    onNameChange: (name) => setProjectDraft((prev) => ({ ...prev, name })),
    nameError: createProjectFieldErrors.nameError,
    billingIdentity: projectDraft.billingIdentity,
    onBillingIdentityChange: (billingIdentity) =>
      setProjectDraft((prev) => ({ ...prev, billingIdentity })),
    billingIdentityError: createProjectFieldErrors.billingIdentityError,
    plans,
    plansLoading: plansQuery.isLoading,
    plansError: plansQuery.isError ? "Couldn't load billing plans." : undefined,
    onRetryPlans: () => void plansQuery.refetch(),
    planId: resolvedPlanId,
    onPlanChange: (planId) => setProjectDraft((prev) => ({ ...prev, planId })),
    submitting: newProjectAction.isPending,
    error: createProjectFieldErrors.error,
    canSubmit: canSubmitCreateProject,
    onSubmit: () => {
      if (!canSubmitCreateProject) return;
      newProjectAction.mutate();
    },
    onCancel: () => {
      // Only clears the shared mutation entry when there is an ERROR to clear — mirrors
      // `use-api-keys-screen.ts`'s `createKeyDialog.onCancel`.
      if (newProjectAction.errorMessage) newProjectAction.dismiss();
      resetProjectDraft();
      void setView({ createOpen: false }, MANAGE_SELECTION_OPTIONS);
    },
  };

  /**
   * Ticket #309: `Generate report` calls the real `/api/reports/consumption` route (#308) and
   * triggers a real file download.
   *
   * BOTH formats are now real. This used to throw `"PDF export isn't available — CSV only."` for
   * every `format === 'pdf'` press — an honest refusal, but the defect was never the message: the
   * UI offered PDF as a peer of CSV (the `ReportExportPanel` format toggle, taken from Coinbase's
   * download-report pattern in `docs/design/console-redesign/README.md` §1.2) and then refused
   * every second choice. The route now renders the same project × model report as a paginated PDF
   * server-side (`server/consumption-pdf.ts`), so `format` is passed straight through instead of
   * being intercepted here.
   */
  const reportAction = useSharedMutation<ReportExportParams, void>({
    mutationKey: REPORT_MUTATION_KEY,
    mutationFn: async (params) => {
      if (!scope.value.accountId) {
        throw new Error('Select an account before generating a report.');
      }
      const query = new URLSearchParams({
        month: params.period,
        account: scope.value.accountId,
        format: params.format,
      });
      if (scope.value.projectId) query.set('project', scope.value.projectId);

      const response = await fetch(`/api/reports/consumption?${query.toString()}`);
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body &&
          typeof body === 'object' &&
          typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : 'Could not generate the report. Try again.';
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename =
        filenameFromContentDisposition(response.headers.get('content-disposition')) ??
        `consumption-${params.period}.${params.format}`;
      downloadBlob(blob, filename);
    },
  });

  // The SELECTION rail's subject is `?row=<id>`, looked up in the loaded page — so a link to a
  // selected project reopens on that project, and Back deselects instead of leaving `/projects`.
  const selectedProject = rows.find((row) => row.id === view.selectedProjectId) ?? null;

  const activeAccount = scope.allAccounts.find(
    (account) => account.id === scope.value.accountId
  );

  return {
    scopeLabel: activeAccount ? accountScopeLabel(activeAccount) : undefined,
    rows,
    loading: list.query.isLoading,
    // A failed SPEND query does not fail the whole screen — the projects list itself is fine, and
    // `applyProjectSpend` already leaves every row's `spendMtd` at its honest `null` (em dash)
    // when `spendStatus` is `'error'`. Only a genuinely failed PROJECTS fetch replaces the ledger
    // with `ErrorLine`.
    errorMessage: list.query.isError ? 'Could not load projects.' : undefined,
    retry: refresh,
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
    filtersActive: Boolean(view.search.trim()) || view.status !== 'all' || view.budgetState !== 'all',
    newProject: () => {
      if (!createProjectEligible) return;
      if (newProjectAction.errorMessage) newProjectAction.dismiss();
      void setView({ createOpen: true }, MANAGE_SELECTION_OPTIONS);
    },
    createProjectEligible,
    createProjectReason,
    createProjectDialog,
    selectedProject,
    selectRow: (row) => {
      void setView({ selectedProjectId: row.id }, MANAGE_SELECTION_OPTIONS);
    },
    clearSelection: () => {
      void setView({ selectedProjectId: '' }, MANAGE_SELECTION_OPTIONS);
    },
    projectCount: total,
    sort: { key: view.sortKey, direction: view.sortDirection },
    onSortChange: (sort) => {
      void setView({
        sortKey: sort.key as (typeof PROJECTS_SORT_KEYS)[number],
        sortDirection: sort.direction,
      });
    },
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
      open: view.reportOpen,
      onOpenChange: (open) => {
        void setView({ reportOpen: open }, MANAGE_SELECTION_OPTIONS);
      },
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
      onGenerate: (params) => reportAction.mutate(params),
      generating: reportAction.isPending,
      notice: reportAction.errorMessage
        ? { message: reportAction.errorMessage, onDismiss: reportAction.dismiss }
        : undefined,
    },
  };
}
