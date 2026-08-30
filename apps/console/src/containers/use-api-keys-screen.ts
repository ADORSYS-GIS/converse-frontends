'use client';

import type { ApiKey, BillingPlanInfo, ProjectMember } from '@lightbridge/authz-rpc';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysHygiene,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
  CreateApiKeyDialogProps,
  LedgerSort,
  SelectFieldProps,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useDelete, useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import { useConsoleSession } from '../client/session-context';
import { useConsoleAuthzClient } from '../client/rpc-clients';
import {
  API_KEYS_SELECTION_OPTIONS,
  API_KEY_SORT_KEYS,
  API_KEY_STATUSES,
  useApiKeysParams,
} from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import {
  DEFAULT_KEY_EXPIRY_DAYS,
  EXPIRY_DAY_OPTIONS,
  apiKeysHygiene,
  computeExpiresAtIso,
  toApiKeyRows,
} from './api-key-rows';

/**
 * `/api-keys` — the screen's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/api-keys/page.tsx`).
 *
 * The adapter's whole job is turning URL state + hook state into section props: the sections stay
 * pure (no fetching, no refine hooks, no nuqs), exactly as the console-ui skill requires. Listing,
 * paging and filtering go through the generated DataProvider; create/rotate/revoke are cratestack
 * **procedures**, which a `DataProvider` has no slot for, so they call the client directly.
 *
 * **The URL is the bus** (ADR 0011). Centre and rail both call this hook, so they issue the same
 * `useList` key and TanStack Query serves both from ONE request — and both read the same
 * `?status=…&q=…&page=…&key=…` params, so the rail's FILTERS section and the centre's ledger cannot
 * drift apart. The flow is strictly one-way: URL -> filters -> refine (`syncWithLocation` is off).
 *
 * **What is deliberately NOT in the URL**: the one-time secret a create/rotate returns, and the
 * reason an action failed. Both are mutation outcomes, both are still needed in a *different* zone
 * from the one that fired them, and the first is a credential that must never be written to a
 * history entry — so they travel through the shared `MutationCache` instead
 * (`client/use-shared-mutation.ts`).
 *
 * **Delete (ticket #321)**: `Del` is gated exactly like Revoke — a `TypedConfirmDialog` retargeted
 * by `?delete=<id>`, gone through `useDelete()`'s own `mutation` (a full react-query
 * `UseMutationResult`) rather than the shared cache, because unlike Revoke this mutation has no
 * other zone to share its outcome with — the dialog only ever renders in the centre. `isAdmin`
 * comes straight from the session (`useConsoleSession()`) the root layout already decrypted
 * server-side; it is presentation only — see `ApiKeysLedgerProps.isAdmin`'s doc comment for why
 * this is not the security boundary.
 *
 * **Create (tickets #317/#319/#320, redesigned live findings #4, 2026-08-30)**: `+ New key` now
 * opens `CreateApiKeyDialog` (`?create=1`) instead of firing `createApiKey` straight off with an
 * invented name, a hardcoded 90-day expiry and a hardcoded `billingPlan: 'standard'` that does
 * not exist in any real backend's catalogue (the bug that made key creation fail for everyone).
 * The dialog collects a real name, a target PROJECT, and expiry from the caller and a real plan
 * id from `listBillingPlans` — see `api-key-rows.ts` for why the offered expiry presets stay
 * under the documented 90-day ceiling.
 *
 * The trigger's own gate (`createKeyEligible`/`createKeyReason`, shared by `PageHeader.action`
 * and the ledger's `EmptyState` CTA) disables `+ New key` ONLY when the account has no project at
 * all — never merely because the toolbar's `projectField` happens to be scoped to "All projects".
 * That used to be the gate (`!activeProjectId`), which meant the button was disabled the moment
 * anyone landed on the screen in its default scope, with no way to proceed short of first
 * changing an unrelated filter. A key belongs to exactly one project, but which one is the
 * DIALOG'S question, not the ledger filter's — so the Project field lives inside
 * `CreateApiKeyDialog` (defaulting to the toolbar's scoped project when one is set, else the
 * first project the account can read) and `createKeyEligible`/`createKeyReason` mirror
 * `createApiKey`'s lead/owner gate (`authz.cstack:520-528`) is now evaluated against THAT
 * selection (`draftProjectId`) as the dialog's own `projectReason` caption, not against the
 * trigger. Both checks stay presentation only, same disclaimer as `isAdmin` above:
 * `lightbridge-authz`'s hand-written SQL check is the actual enforcement
 * (`packages/hooks/src/rbac.ts` documents the same pattern for the coarser role grants).
 */

const PAGE_SIZE = 25;
const MEMBERS_PAGE_SIZE = 100;

const STATUS_LABELS: Record<(typeof API_KEY_STATUSES)[number], string> = {
  all: 'All',
  active: 'Active',
  revoked: 'Revoked',
};

export const STATUS_FILTER_OPTIONS: SegmentedOption<string>[] = API_KEY_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

/** `ApiKeyRow`'s own sortable column keys (`created`/`lastUsed`/`expires`) map onto the real
 *  `ApiKey` fields the `apiKeys` resource actually sorts by — the ledger's presentation keys are
 *  not the backend's field names (`created` renders `createdAt`, formatted). */
const SORT_FIELD_BY_KEY: Record<(typeof API_KEY_SORT_KEYS)[number], string> = {
  created: 'createdAt',
  lastUsed: 'lastUsedAt',
  expires: 'expiresAt',
};

/**
 * Module-level so every zone agrees on the identity: `+ New key` is pressed in the rail, the
 * secret it returns is rendered by the ledger in the centre.
 */
const SECRET_MUTATION_KEY = ['api-keys', 'secret'];
const REVOKE_MUTATION_KEY = ['api-keys', 'revoke'];
const BILLING_PLANS_QUERY_KEY = ['api-keys', 'billingPlans'];

type SecretRequest =
  | {
      kind: 'create';
      projectId: string | null;
      name: string;
      expiresAt: string;
      billingPlan: string | null;
    }
  | { kind: 'rotate'; keyId: string; name: string };

type CreateKeyDraft = {
  /** The dialog's OWN project selection — deliberately separate from the toolbar's
   *  `scope.value.projectId` filter (live findings #4, 2026-08-30). See the module doc comment's
   *  "Create" section for why the two used to be, wrongly, the same value. */
  projectId: string | null;
  name: string;
  expiryDays: string;
  planId: string | null;
};

function emptyDraft(): CreateKeyDraft {
  return { projectId: null, name: '', expiryDays: String(DEFAULT_KEY_EXPIRY_DAYS), planId: null };
}

export interface ApiKeysScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle`.
   *  `undefined` before an account resolves. */
  scopeAccountLabel: string | undefined;
  scopeProjectLabel: string;
  rows: ApiKeyRow[];
  loading: boolean;
  errorMessage: string | undefined;
  /** No more `statusSummary` (2026-08-30 revamp brief): it duplicated `ApiKeysHygieneNotes`,
   *  mounted above the ledger — `hygiene`, below, stays the ONE status line. */
  hygiene: ApiKeysHygiene;
  secretReveal: ApiKeysSecretReveal | null;
  dismissSecret: () => void;
  revokeTarget: ApiKeysRevokeTarget | null;
  requestRevoke: (row: ApiKeyRow) => void;
  confirmRevoke: (row: ApiKeyRow) => void;
  cancelRevoke: () => void;
  rotate: (row: ApiKeyRow) => void;
  isAdmin: boolean;
  deleteTarget: ApiKeysDeleteTarget | null;
  requestDelete: (row: ApiKeyRow) => void;
  confirmDelete: (row: ApiKeyRow) => void;
  cancelDelete: () => void;
  /** Opens `createKeyDialog` — a no-op while `createKeyEligible` is false. */
  createKey: () => void;
  /**
   * Presentation-only mirror of `createApiKey`'s lead/owner gate — see the module doc comment.
   * `false` whenever eligibility cannot be confirmed (no project scoped, still loading, or the
   * roster fetch failed), never defaulted to `true`.
   */
  createKeyEligible: boolean;
  /** Stated beside the disabled `+ New key` control; `undefined` exactly when eligible. */
  createKeyReason: string | undefined;
  createKeyDialog: CreateApiKeyDialogProps;
  selectedRowKeys: string[];
  selectRow: (row: ApiKeyRow) => void;
  sort: LedgerSort;
  onSortChange: (sort: LedgerSort) => void;
  retry: () => void;
  pagination: {
    shown: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  projectField: Omit<SelectFieldProps, 'layout'>;
  statusFilterOptions: SegmentedOption<string>[];
  statusFilterValue: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}

export function useApiKeysScreen(): ApiKeysScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const [view, setView] = useApiKeysParams();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.projectId) {
      active.push({ field: 'projectId', operator: 'eq' as const, value: scope.value.projectId });
    }
    if (view.status !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: view.status });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.projectId, view.status, view.search]);

  const list = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: SORT_FIELD_BY_KEY[view.sortKey], order: view.sortDirection }],
  });

  // `mutation` is the underlying react-query `UseMutationResult` — its own `.error`/`.isPending`
  // give the delete confirmation everything it needs without a `useSharedMutation`: unlike
  // Revoke, which is a bespoke procedure call, Delete goes through refine's generic resource
  // `DataProvider` (`useDelete`) already gets a per-instance mutation object for free, and the
  // dialog it feeds only ever renders in this one zone (the centre), so there is no second zone
  // to read the outcome from a shared cache.
  const { mutate: deleteKeyMutate, mutation: deleteMutation } = useDelete();

  const refresh = () => {
    void list.query.refetch();
  };

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the create-key form's typed-but-unsent name/expiry/plan.
   * `createOpen` — WHETHER the dialog is showing — is real view state and lives in the URL
   * (`?create=1`, `url-state.ts`); this is its CONTENTS, which are not, for the same reason the
   * admin review's rejection-note draft is not (`use-refills-queue-screen.ts`): typed prose ahead of a
   * submit, discarded either way, and `?create=1&name=ci-deploy` would write every keystroke into
   * browser history and into any link copied from the address bar. The dialog mounts in exactly
   * one zone (the centre, same as `TypedConfirmDialog`), so a per-instance draft cannot
   * desynchronise across zones.
   */
  const [draft, setDraft] = useState<CreateKeyDraft>(emptyDraft);
  const resetDraft = () => setDraft(emptyDraft());

  // Ticket #317: the real billing-plan catalogue, replacing the hardcoded `'standard'` literal.
  // `listBillingPlans` is a procedure, not a resource — same reason `use-refills-queue-screen.ts` reaches
  // for `useQuery` directly instead of `useList`.
  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: BILLING_PLANS_QUERY_KEY,
    queryFn: () => client.procedures.listBillingPlans({ args: {} }),
  });
  const plans = plansQuery.data ?? [];
  // Resolved, never written (same idiom `use-console-scope.ts` uses for the default account): the
  // draft only records a plan id once the caller actually picks one, so the first real plan the
  // catalogue returns is what a submit without any picker interaction uses — never a guessed id.
  const resolvedPlanId = draft.planId ?? plans[0]?.id ?? null;

  // Ticket #320, redesigned for live findings #4 (2026-08-30): a presentation-only mirror of
  // `createApiKey`'s lead/owner gate, evaluated against the DIALOG'S OWN project selection
  // (`draft.projectId`), never the toolbar's `scope.value.projectId` filter — see the module doc
  // comment's "Create" section. `scope.projects` is the FULL list the caller can read (own +
  // member-of, `authz.cstack:283`'s `@@allow("read", ...)`), not `ScopeSelect`'s per-account
  // cascade, so this looks the selected project up there rather than assuming the scoped account
  // owns it.
  const draftProjectId = draft.projectId;
  const draftProject = scope.projects.find((project) => project.id === draftProjectId) ?? null;
  const isOwner = Boolean(
    draftProject && scope.value.accountId && draftProject.accountId === scope.value.accountId
  );

  // Only fetched when ownership alone does not already answer the question — an owner never
  // needs the roster to know they may create a key — and only once a project is actually
  // selected, which in practice means only while the dialog is open (`draft.projectId` is `null`
  // whenever it's closed; see `emptyDraft`).
  //
  // `errorNotification: false`: this is a soft, presentation-only eligibility check, not a user
  // action — its own failure is already surfaced honestly and specifically as `projectReason`
  // inside the dialog. Letting refine's console-wide notification provider also pop a generic
  // toast for it would be a second, less precise description of the exact same event.
  const membersQuery = useList<ProjectMember>({
    resource: 'projectMembers',
    pagination: { currentPage: 1, pageSize: MEMBERS_PAGE_SIZE },
    filters: draftProjectId
      ? [{ field: 'projectId', operator: 'eq' as const, value: draftProjectId }]
      : [],
    queryOptions: { enabled: Boolean(draftProjectId) && !isOwner },
    errorNotification: false,
  });
  const isLead = membersQuery.result.data.some(
    (member) =>
      member.projectId === draftProjectId &&
      member.accountId === scope.value.accountId &&
      member.role === 'lead'
  );

  // The `+ New key` TRIGGER's own gate (`PageHeader.action` and the ledger's `EmptyState` CTA
  // both read it) — disabled ONLY when the account genuinely has no project to put a key in,
  // never merely because the toolbar happens to be scoped to "All projects" (live findings #4).
  let createKeyEligible: boolean;
  let createKeyReason: string | undefined;
  if (scope.loading) {
    createKeyEligible = false;
    createKeyReason = 'Loading projects…';
  } else if (scope.projects.length === 0) {
    createKeyEligible = false;
    createKeyReason = 'Create a project before creating a key.';
  } else {
    createKeyEligible = true;
    createKeyReason = undefined;
  }

  // The DIALOG's own per-selection caption — why the CURRENTLY CHOSEN project can't take a new
  // key right now, rendered under its Project field (console-ui skill "Never do: a disabled
  // control with no stated reason" — the same fix as `createKeyReason` above, applied where this
  // particular check now actually happens).
  let projectReason: string | undefined;
  if (!draftProjectId) {
    projectReason = undefined;
  } else if (!isOwner && membersQuery.query.isLoading) {
    projectReason = 'Checking whether you can create keys…';
  } else if (!isOwner && membersQuery.query.isError) {
    // Fails safe: an unconfirmable roster never defaults to "eligible".
    projectReason = "Couldn't confirm you can create keys in this project.";
  } else if (isOwner || isLead) {
    projectReason = undefined;
  } else {
    projectReason = 'Only the project owner or a lead can create keys here.';
  }

  const secret = useSharedMutation<SecretRequest, ApiKeysSecretReveal>({
    mutationKey: SECRET_MUTATION_KEY,
    mutationFn: async (request) => {
      if (request.kind === 'rotate') {
        const rotated = await client.procedures.rotateApiKey({ args: { keyId: request.keyId } });
        return {
          heading: `Rotated ${request.name}`,
          description:
            'The previous secret is now invalid. Copy the new one — it is shown only once.',
          secret: rotated.secret,
        };
      }
      // Guards, not UI branches: reported through the same inline error every other failure of
      // this action uses. `canSubmit` (below) already keeps the dialog's own primary disabled in
      // both cases, so these only fire against a caller bypassing the dialog entirely.
      if (!request.projectId) throw new Error('Select a project before creating a key.');
      if (!request.billingPlan) throw new Error('Choose a billing plan before creating a key.');
      const created = await client.procedures.createApiKey({
        args: {
          projectId: request.projectId,
          name: request.name,
          expiresAt: request.expiresAt,
          billingPlan: request.billingPlan,
        },
      });
      return {
        heading: 'New API key',
        description:
          'Copy it now — this is the only time the secret is shown. It cannot be retrieved again.',
        secret: created.secret,
      };
    },
    onSuccess: (_data, variables) => {
      refresh();
      // Addition D (2026-08-30 owner round, "a card inside a card? why is the form in a modal
      // and the result not?"): a successful CREATE no longer closes the dialog — it switches, in
      // the same modal instance, to its own secret step (`createKeyDialog.result` below). Only
      // `onDone` (the step's own explicit exit) closes it and clears the secret. A ROTATE has no
      // dialog to keep open, so it has nothing further to do here beyond the refresh above.
      if (variables.kind === 'create') {
        resetDraft();
      }
    },
  });

  const revoke = useSharedMutation<{ keyId: string }, void>({
    mutationKey: REVOKE_MUTATION_KEY,
    mutationFn: async ({ keyId }) => {
      await client.procedures.revokeApiKey({ args: { keyId } });
    },
    onSuccess: () => {
      void setView({ revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
      refresh();
    },
  });

  const keys = list.result.data;
  const total = list.result.total ?? keys.length;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure (it makes
  // the output depend on when React happens to re-render), and "expiring soon" is genuinely
  // relative to when the data was read, not to this particular render.
  const now = list.query.dataUpdatedAt;
  const rows = useMemo(() => toApiKeyRows(keys, now), [keys, now]);

  // The revoke DIALOG is view state (`?revoke=<id>`), so Back closes it and the confirmation is
  // linkable; the row it points at is looked up in the data, and the failure reason it may carry
  // comes from the mutation, never from the URL. The delete dialog (`?delete=<id>`) is the same
  // shape.
  const revokeRow = rows.find((row) => row.id === view.revokeKeyId) ?? null;
  const deleteRow = rows.find((row) => row.id === view.deleteKeyId) ?? null;
  const deleteErrorMessage = deleteMutation.error?.message;

  const canSubmitCreate =
    draftProjectId !== null &&
    (isOwner || isLead) &&
    draft.name.trim().length > 0 &&
    resolvedPlanId !== null &&
    !plansQuery.isLoading &&
    !plansQuery.isError;

  const createKeyDialog: CreateApiKeyDialogProps = {
    open: view.createOpen,
    // Always non-empty by the time the dialog can open — `createKeyEligible` already refused the
    // trigger when `scope.projects` is empty.
    projectOptions: scope.projects.map((project) => ({ value: project.id, label: project.label })),
    projectId: draftProjectId,
    onProjectChange: (projectId) => setDraft((prev) => ({ ...prev, projectId })),
    projectReason,
    name: draft.name,
    onNameChange: (name) => setDraft((prev) => ({ ...prev, name })),
    expiryDays: draft.expiryDays,
    expiryOptions: EXPIRY_DAY_OPTIONS,
    onExpiryDaysChange: (expiryDays) => setDraft((prev) => ({ ...prev, expiryDays })),
    plans,
    plansLoading: plansQuery.isLoading,
    plansError: plansQuery.isError ? "Couldn't load billing plans." : undefined,
    onRetryPlans: () => void plansQuery.refetch(),
    planId: resolvedPlanId,
    onPlanChange: (planId) => setDraft((prev) => ({ ...prev, planId })),
    submitting: secret.isPending,
    error: secret.errorMessage,
    canSubmit: canSubmitCreate,
    onSubmit: () => {
      if (!canSubmitCreate || !draftProjectId || resolvedPlanId === null) return;
      secret.mutate({
        kind: 'create',
        projectId: draftProjectId,
        name: draft.name.trim(),
        expiresAt: computeExpiresAtIso(Number(draft.expiryDays), Date.now()),
        billingPlan: resolvedPlanId,
      });
    },
    onCancel: () => {
      // Only clears the shared mutation entry when there is an ERROR to clear — `secret`'s data
      // and error are mutually exclusive on one cache entry, so this never wipes an already-
      // showing secret from an unrelated, already-succeeded rotate.
      if (secret.errorMessage) secret.dismiss();
      resetDraft();
      void setView({ createOpen: false }, API_KEYS_SELECTION_OPTIONS);
    },
    // Addition D — while the dialog is open, a populated `secret.data` can only be THIS create's
    // own result: the dialog is modal, so the background ledger's own Rotate action is unreachable
    // while it is showing, and `createKey` (below) dismisses any stale outcome before opening.
    result: view.createOpen ? (secret.data ?? null) : null,
    onDone: () => {
      secret.dismiss();
      void setView({ createOpen: false }, API_KEYS_SELECTION_OPTIONS);
    },
  };

  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);

  return {
    scopeAccountLabel: activeAccount ? accountScopeLabel(activeAccount) : undefined,
    scopeProjectLabel:
      scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
      'All projects',
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError ? 'Could not load API keys.' : secret.errorMessage,
    hygiene: apiKeysHygiene(keys, now),
    // Addition D — the CREATE half of this shared outcome now shows inside `createKeyDialog`
    // itself while it is open (`result` above), so this floor-level slot is for ROTATE's own
    // result only: suppressed while the create dialog is showing, so the two surfaces never
    // display the same secret at once.
    secretReveal: !view.createOpen && secret.data ? secret.data : null,
    dismissSecret: secret.dismiss,
    revokeTarget: revokeRow ? { row: revokeRow, error: revoke.errorMessage } : null,
    requestRevoke: (row) => {
      revoke.dismiss();
      // Only one destructive dialog can be open at once — clearing the other target here means
      // Revoke and Delete can never both be `?revoke=…&delete=…` at the same time.
      void setView({ revokeKeyId: row.id, deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    confirmRevoke: (row) => revoke.mutate({ keyId: row.id }),
    cancelRevoke: () => {
      revoke.dismiss();
      void setView({ revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    rotate: (row) => secret.mutate({ kind: 'rotate', keyId: row.id, name: row.name }),
    // Presentation only (see `ApiKeysLedgerProps.isAdmin`'s doc comment): `lightbridge-authz`
    // refuses `apiKeys:delete` server-side regardless of what this renders.
    isAdmin: session.isAdmin,
    deleteTarget: deleteRow ? { row: deleteRow, error: deleteErrorMessage } : null,
    requestDelete: (row) => {
      deleteMutation.reset();
      void setView({ deleteKeyId: row.id, revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    confirmDelete: (row) => {
      deleteKeyMutate(
        // `errorNotification`/`successNotification: false` — converse-frontends#333 already
        // gives this failure a local, contextual home (`deleteErrorMessage` inline in
        // `TypedConfirmDialog`, right where the reviewer is looking). Without these,
        // converse-frontends#323's new console-wide `notificationProvider` would ALSO fire its
        // default banner for the exact same failure — the double-notification the ticket's own
        // Risks section calls out by name. `TypedConfirmDialog`'s existing local error stays the
        // one true source for this specific mutation; the banner is the default for everything
        // that has no such local handling.
        { resource: 'apiKeys', id: row.id, errorNotification: false, successNotification: false },
        {
          onSuccess: () => {
            void setView({ deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
            refresh();
          },
        }
      );
    },
    cancelDelete: () => {
      deleteMutation.reset();
      void setView({ deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    createKey: () => {
      if (!createKeyEligible) return;
      // Clears ANY stale outcome — an error, or a lingering successful secret from an earlier,
      // unrelated rotate — before opening: Addition D (2026-08-30) makes the dialog display
      // `secret.data` directly as its own secret step, so a leftover rotate result must never
      // appear to belong to a freshly-opened create form.
      if (secret.errorMessage || secret.data) secret.dismiss();
      // Defaults the dialog's own Project field to whatever the toolbar happens to be scoped to
      // — a real head start, never a requirement — falling back to the first project the account
      // can read when the toolbar is at its default "All projects" scope. `createKeyEligible`
      // already guarantees `scope.projects` is non-empty here.
      setDraft((prev) => ({
        ...prev,
        projectId: scope.value.projectId ?? scope.projects[0]?.id ?? null,
      }));
      void setView({ createOpen: true }, API_KEYS_SELECTION_OPTIONS);
    },
    createKeyEligible,
    createKeyReason,
    createKeyDialog,
    selectedRowKeys: view.selectedKeyId ? [view.selectedKeyId] : [],
    selectRow: (row) => {
      void setView({ selectedKeyId: row.id }, API_KEYS_SELECTION_OPTIONS);
    },
    sort: { key: view.sortKey, direction: view.sortDirection },
    onSortChange: (sort) => {
      void setView({
        sortKey: sort.key as (typeof API_KEY_SORT_KEYS)[number],
        sortDirection: sort.direction,
        page: 1,
      });
    },
    retry: refresh,
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
    // Project only — account is identity and lives in the header's `AccountBadge` (owner review
    // 2026-08-29), so the rail's account+project `ScopeSelect` is gone and this is what replaced
    // its useful half: the one scope value that genuinely changes what this screen lists, in the
    // toolbar beside the filters that narrow within it.
    projectField: {
      label: 'Project',
      value: scope.value.projectId ?? '',
      options: [
        { value: '', label: 'All projects' },
        ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
      ],
      onChange: (projectId) => {
        scope.setValue({ accountId: scope.value.accountId, projectId: projectId || null });
        // Re-scoping invalidates the current page number. Queued in the same tick as the scope
        // write above, so nuqs coalesces both into ONE history entry — not two Back presses.
        void setView({ page: 1 }, { history: 'push' });
      },
    },
    statusFilterOptions: STATUS_FILTER_OPTIONS,
    statusFilterValue: view.status,
    setStatusFilter: (status) => {
      void setView({ status: status as (typeof API_KEY_STATUSES)[number], page: 1 });
    },
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
  };
}
