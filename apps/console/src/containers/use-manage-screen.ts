'use client';

import type { Account, BillingPlanInfo, Project } from '@lightbridge/authz-rpc';
import { createId } from '@lightbridge/authz-rpc';
import type {
  AccountNameDialogMode,
  AccountNameDialogProps,
  AccountPanelProps,
  CreateProjectDialogProps,
  ManageFiltersRailProps,
  ManageReportRailProps,
  ManageTotals,
  ProjectRow,
  ReportExportParams,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
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
import {
  buildCreateAccountInput,
  buildUpdateAccountNameInput,
  normalizeAccountName,
} from './build-create-account-input';
import { buildCreateProjectInput } from './build-create-project-input';
import { classifyCreateAccountError, classifyCreateProjectError } from './rpc-field-error';
import { downloadBlob, filenameFromContentDisposition } from './download-file';
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
 * An inline status line naming exactly what is missing, rather than a subline that quietly
 * asserts something the screen has never fetched (issue #271 — the old
 * `subline="spend shown month-to-date"` was that claim).
 *
 * Console-ui#326: no "(ADR 0009 follow-ups N)" citation — follow-up 4 (the `apps/console`
 * scaffold) shipped, so citing it here was simply wrong, and an internal ADR follow-up index is
 * not something this self-service console's own customers should have to decode. State the fact
 * plainly instead; see the PR body for the full argument against citing follow-up numbers in
 * user-visible copy.
 *
 * Reworded by #304/#305 (Epic 4, Story 4.2): the usage-backend query client this string used to
 * say didn't exist now does (`apps/console/src/client/usage-client.ts`), and Overview's own SPEND
 * dashboards use it — so "no usage-backend query client yet" would now be a false claim on THIS
 * screen. What remains true, and is now what this string says, is narrower: Manage itself has no
 * query wired to its own per-project spend/quota column. Wiring that is out of this story's scope
 * (Overview's dashboards only) — tracked as its own follow-up, not invented here.
 */
export const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are not shown here yet: this screen does not query the usage backend. Project status and quota tier below are live.';

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
 * Module-level so every zone agrees on the identity: `Generate report` can be fired from either
 * the persistent rail or the centre's compact-tier sheet (`ReportExportPanel` mounts twice), so
 * its outcome has to be visible regardless of which copy was pressed. `+ New project` only ever
 * renders in the centre (`ManageProjectsLedger`'s own toolbar), but shares the same
 * `useSharedMutation` shape as the rest of this file for consistency.
 */
const NEW_PROJECT_MUTATION_KEY = ['manage', 'new-project'];
/**
 * One key for both account writes. `createAccount` and `updateAccountName` are never both
 * available at once — the signed-in subject either holds an account or does not — so they cannot
 * be in flight simultaneously, and sharing the key means the one `AccountNameDialog` reads one
 * `submitting`/`errorMessage` pair regardless of which procedure it is driving.
 */
const ACCOUNT_NAME_MUTATION_KEY = ['manage', 'account-name'];
const REPORT_MUTATION_KEY = ['manage', 'report'];
const PROJECT_BILLING_PLANS_QUERY_KEY = ['manage', 'billingPlans'];

type CreateProjectDraft = {
  name: string;
  billingIdentity: string;
  planId: string | null;
};

function emptyProjectDraft(): CreateProjectDraft {
  return { name: '', billingIdentity: '', planId: null };
}

export interface ManageScreen {
  rows: ProjectRow[];
  loading: boolean;
  /** A genuine failed projects fetch — the only case rendered through `ErrorLine`. */
  errorMessage: string | undefined;
  /** Matches `useOverviewScreen`'s `emptyMessage` — an always-visible inline status line naming
   *  exactly what is unwired (issue #271), never folded into `ScreenHeading`'s `subline`. */
  spendPendingMessage: string;
  totals: ManageTotals;
  retry: () => void;
  search: string;
  setSearch: (value: string) => void;
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
  /**
   * The signed-in principal's own account, plus the create/name affordance it needs.
   *
   * This screen, and not a dedicated route or an onboarding wizard, because Manage is the only
   * governance surface the console has (every other screen renders usage data), because the
   * account scope this panel is about is already what Manage filters by, and because "signed in
   * with no account" is precisely the dead end Manage exhibits today — a `+ New project` disabled
   * with "Select an account to create a project." and no account to select. Putting the exit next
   * to the dead end is the point. A route of its own would also mean a permanent nav entry for a
   * control most people press once, while leaving the rename affordance — which is NOT one-time,
   * because every pre-#551 account is unnamed — with nowhere to live.
   */
  accountPanel: AccountPanelProps;
  /** `AccountNameDialog`'s props — the same dialog for both account writes; `mode` is derived
   *  from whether an account exists, never chosen by the user. */
  accountNameDialog: AccountNameDialogProps;
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

  /**
   * The signed-in principal's OWN account, matched on `sub` rather than on the scoped
   * `?account=` id.
   *
   * `accounts.id` IS the JWT subject (ADR-0006) and one subject holds at most one account, so
   * this is the only account `createAccount`/`updateAccountName` could ever target — matching the
   * scoped id instead would make the panel silently retarget when a link carries someone else's
   * account. `null` here means "signed in, no account", which is what the panel offers a way out
   * of; it is distinguished from "we do not know yet" by `scope.loading`/`scope.error`, which the
   * panel renders separately.
   */
  const ownAccount: Account | null =
    scope.allAccounts.find((account) => account.id === session.user?.sub) ?? null;
  const accountMode: AccountNameDialogMode = ownAccount === null ? 'create' : 'rename';

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the account dialog's typed-but-unsent name. Exactly the same
   * argument as the create-project draft above — `?account-name=1` (WHETHER the dialog is
   * showing) is real view state and lives in the URL, its CONTENTS are typed prose ahead of a
   * submit and would otherwise be written into browser history and into any copied link. Seeded
   * from the current name when the dialog opens, so a rename starts from what the account is
   * actually called rather than from blank.
   */
  const [accountNameDraft, setAccountNameDraft] = useState('');

  let createAccountEligible: boolean;
  let createAccountReason: string | undefined;
  if (!session.user) {
    createAccountEligible = false;
    createAccountReason = 'Sign in to create an account.';
  } else if (ownAccount !== null) {
    createAccountEligible = false;
    // `createAccount` is `Error::Conflict` for a subject that already holds one, never an upsert.
    createAccountReason = 'This identity already has an account.';
  } else {
    createAccountEligible = true;
    createAccountReason = undefined;
  }

  const accountAction = useSharedMutation<{ mode: AccountNameDialogMode; name: string }, Account>({
    mutationKey: ACCOUNT_NAME_MUTATION_KEY,
    mutationFn: async ({ mode, name }) => {
      // Guards, not UI branches — `canSubmitAccountName` already keeps the dialog's own primary
      // disabled in each of these cases; this only fires against a caller bypassing the dialog.
      if (mode === 'create') {
        if (!session.user) throw new Error('Sign in before creating an account.');
        if (ownAccount !== null) throw new Error('This identity already has an account.');
        return client.procedures.createAccount({ args: buildCreateAccountInput({ name }) });
      }
      if (ownAccount === null) throw new Error('There is no account to name yet.');
      return client.procedures.updateAccountName({
        args: buildUpdateAccountNameInput({ accountId: ownAccount.id, name }),
      });
    },
    onSuccess: () => {
      // Refetches accounts AND projects: a brand-new account arrives with a server-provisioned
      // default project, so the ledger below is stale too.
      scope.refetch();
      refresh();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, MANAGE_SELECTION_OPTIONS);
    },
  });

  const accountFieldErrors = accountAction.errorMessage
    ? classifyCreateAccountError(accountAction.errorMessage)
    : {};

  /**
   * `create`: always submittable — a blank name is legal and produces an unnamed account, so a
   * "fill this in" gate here would be a stricter rule than the server's own (which normalises
   * blank to `NULL`).
   * `rename`: blocked only when the normalised value already equals what the account is called,
   * because that write would change nothing.
   */
  const canSubmitAccountName =
    accountMode === 'create'
      ? createAccountEligible
      : normalizeAccountName(accountNameDraft) !== (ownAccount?.name ?? null);

  const openAccountNameDialog = () => {
    if (accountAction.errorMessage) accountAction.dismiss();
    setAccountNameDraft(ownAccount?.name ?? '');
    void setView({ accountNameOpen: true }, MANAGE_SELECTION_OPTIONS);
  };

  const accountPanel: AccountPanelProps = {
    account: ownAccount === null ? null : { id: ownAccount.id, name: ownAccount.name ?? null },
    loading: scope.loading,
    error: scope.error ? 'Could not load your account.' : undefined,
    onRetry: () => scope.refetch(),
    onCreate: () => {
      if (!createAccountEligible) return;
      openAccountNameDialog();
    },
    createDisabled: !createAccountEligible,
    createReason: createAccountReason,
    onRename: openAccountNameDialog,
  };

  const accountNameDialog: AccountNameDialogProps = {
    open: view.accountNameOpen,
    mode: accountMode,
    subjectLabel: ownAccount?.id ?? session.user?.sub ?? '—',
    currentlyNamed: (ownAccount?.name ?? null) !== null,
    name: accountNameDraft,
    onNameChange: setAccountNameDraft,
    nameError: accountFieldErrors.nameError,
    submitting: accountAction.isPending,
    error: accountFieldErrors.error,
    canSubmit: canSubmitAccountName,
    onSubmit: () => {
      if (!canSubmitAccountName) return;
      accountAction.mutate({ mode: accountMode, name: accountNameDraft });
    },
    onCancel: () => {
      if (accountAction.errorMessage) accountAction.dismiss();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, MANAGE_SELECTION_OPTIONS);
    },
  };

  // The real billing-plan catalogue (same procedure `use-api-keys-screen.ts` uses for the same
  // reason) — never a hardcoded plan id.
  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: PROJECT_BILLING_PLANS_QUERY_KEY,
    queryFn: () => client.procedures.listBillingPlans({ args: {} }),
  });
  const plans = plansQuery.data ?? [];
  const resolvedPlanId = projectDraft.planId ?? plans[0]?.id ?? null;

  // Owner-only gate mirror — see `ManageScreen.createProjectEligible`'s own doc comment for why
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
  // selected project reopens on that project, and Back deselects instead of leaving `/manage`.
  const selectedProject = rows.find((row) => row.id === view.selectedProjectId) ?? null;

  return {
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError ? 'Could not load projects.' : undefined,
    spendPendingMessage: MANAGE_SPEND_PENDING_MESSAGE,
    totals: manageTotals(rows, total),
    retry: refresh,
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
    newProject: () => {
      if (!createProjectEligible) return;
      if (newProjectAction.errorMessage) newProjectAction.dismiss();
      void setView({ createOpen: true }, MANAGE_SELECTION_OPTIONS);
    },
    createProjectEligible,
    createProjectReason,
    createProjectDialog,
    accountPanel,
    accountNameDialog,
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
      onGenerate: (params) => reportAction.mutate(params),
      generating: reportAction.isPending,
      notice: reportAction.errorMessage
        ? { message: reportAction.errorMessage, onDismiss: reportAction.dismiss }
        : undefined,
    },
  };
}
