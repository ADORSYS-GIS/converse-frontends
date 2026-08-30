'use client';

import type { BillingPlanInfo, Project } from '@lightbridge/authz-rpc';
import { createId } from '@lightbridge/authz-rpc';
import type { CreateProjectDialogProps } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { useInvalidate } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useCreateProjectDialogParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import { isOwnedAccountId } from './account-ownership';
import { buildCreateProjectInput } from './build-create-project-input';
import { classifyCreateProjectError } from './rpc-field-error';

/**
 * `CreateProjectDialog` + the mutation that drives it, lifted OUT of `use-projects-screen.ts`
 * (rail-return round, 2026-08-30 — owner: "I create account in settings or in a raw dropdown, but
 * project only in projects? Not in settings?"). Mirrors `use-create-account-dialog.ts` exactly
 * (ADR-0026's own precedent for "one dialog instance, several structurally separate triggers"):
 * `CreateProjectDialog` is now reachable from `/projects`' own `PageHeader` action,
 * `/settings/projects`' own `PageHeader` action, AND the inspector rail's quick-settings
 * "+ New project" row (every route) — three subtrees that share nothing but the query string.
 *
 *  - `useCreateProjectDialog()` — the FULL controller: dialog props AND the mutation. Call this
 *    exactly ONCE, in `app/(console)/layout.tsx`, which renders the one `CreateProjectDialog` this
 *    flow ever mounts.
 *  - `useOpenCreateProjectDialog()` — just the trigger, plus the same eligibility pair
 *    `use-projects-screen.ts` used to compute locally (`createProjectEligible`/`createProjectReason`
 *    — "select an account" / "sign in" / "only the owner can create a project"), since every
 *    trigger site (a `PageHeader` action, a settings-list row) needs to know whether to disable
 *    itself, not only whether it can open the dialog.
 *
 * On success, invalidates every `projects` LIST query via refine's own `useInvalidate` (not a
 * hand-rolled `queryClient.invalidateQueries` against a guessed key) — this reaches
 * `use-projects-screen.ts`'s ledger, `use-console-scope.ts`'s own project list, and
 * `use-project-settings-screen.ts`'s list, wherever any of them happen to be mounted, without this
 * module needing to know their internal query-key shapes.
 */
export interface CreateProjectDialogController {
  dialog: CreateProjectDialogProps;
  open: () => void;
  eligible: boolean;
  reason: string | undefined;
}

const NEW_PROJECT_MUTATION_KEY = ['projects', 'new-project'];
const PROJECT_BILLING_PLANS_QUERY_KEY = ['projects', 'billingPlans'];

type CreateProjectDraft = {
  name: string;
  billingIdentity: string;
  planId: string | null;
};

function emptyProjectDraft(): CreateProjectDraft {
  return { name: '', billingIdentity: '', planId: null };
}

/**
 * Presentation-only mirror of `model.Project.create`'s owner-only `@@allow` gate (`authz.cstack`
 * — `account.userId == auth().id`). "Owner" means `isAccountOwner`/`isOwnedAccountId`
 * (`account-ownership.ts`, ADR-0026): the scoped account's `userId` is the signed-in principal,
 * not merely that person having project membership in it. `false` whenever ownership cannot be
 * confirmed, never defaulted to `true` — the real enforcement is `lightbridge-authz`'s own RBAC
 * check; this only avoids offering a control that would fail.
 */
function useCreateProjectEligibility(): { eligible: boolean; reason: string | undefined } {
  const scope = useConsoleScope();
  const session = useConsoleSession();

  if (!scope.value.accountId) {
    return { eligible: false, reason: 'Select an account to create a project.' };
  }
  if (!session.user) {
    return { eligible: false, reason: 'Sign in to create a project.' };
  }
  if (!isOwnedAccountId(scope.value.accountId, scope.allAccounts, session)) {
    return { eligible: false, reason: 'Only the account owner can create a project.' };
  }
  return { eligible: true, reason: undefined };
}

export function useCreateProjectDialog(): CreateProjectDialogController {
  const scope = useConsoleScope();
  const client = useConsoleAuthzClient();
  const invalidate = useInvalidate();
  const [params, setParams] = useCreateProjectDialogParams();
  const { eligible, reason } = useCreateProjectEligibility();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause `use-projects-screen.ts` documented
   * before this moved): the create-project dialog's typed-but-unsent name/billing identity/plan.
   * `?new-project=true` — WHETHER the dialog is showing — is real view state and lives in the
   * URL; this is its CONTENTS, which are not.
   */
  const [draft, setDraft] = useState<CreateProjectDraft>(emptyProjectDraft);
  const resetDraft = () => setDraft(emptyProjectDraft());

  // The real billing-plan catalogue (same procedure `use-api-keys-screen.ts` uses for the same
  // reason) — never a hardcoded plan id.
  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: PROJECT_BILLING_PLANS_QUERY_KEY,
    queryFn: () => client.procedures.listBillingPlans({ args: {} }),
  });
  const plans = plansQuery.data ?? [];
  const resolvedPlanId = draft.planId ?? plans[0]?.id ?? null;

  const action = useSharedMutation<void, Project>({
    mutationKey: NEW_PROJECT_MUTATION_KEY,
    mutationFn: async () => {
      // Guards, not UI branches: `canSubmit` (below) already keeps the dialog's own primary
      // disabled in every one of these cases — this only fires against a caller bypassing the
      // dialog entirely, same idiom `use-api-keys-screen.ts`'s `secret` mutation uses.
      if (!scope.value.accountId) {
        throw new Error('Select an account before creating a project.');
      }
      if (!draft.name.trim()) {
        throw new Error('Name the project before creating it.');
      }
      if (!draft.billingIdentity.trim()) {
        throw new Error('Give the project a billing identity before creating it.');
      }
      if (!resolvedPlanId) {
        throw new Error('Choose a billing plan before creating a project.');
      }
      return client.projects.create(
        buildCreateProjectInput({
          id: createId(),
          accountId: scope.value.accountId,
          name: draft.name.trim(),
          billingIdentity: draft.billingIdentity.trim(),
          billingPlan: resolvedPlanId,
        })
      );
    },
    onSuccess: () => {
      void invalidate({ resource: 'projects', invalidates: ['list'] });
      resetDraft();
      void setParams({ open: false });
    },
  });

  // `getApiErrorMessage` already ran inside `useSharedMutation` (see its own doc comment) — this
  // routes the CLEAN decoded message onto the field it actually names, or a general line when it
  // names neither (`classifyCreateProjectError`'s own doc comment).
  const fieldErrors = action.errorMessage ? classifyCreateProjectError(action.errorMessage) : {};

  const canSubmit =
    draft.name.trim().length > 0 &&
    draft.billingIdentity.trim().length > 0 &&
    resolvedPlanId !== null &&
    !plansQuery.isLoading &&
    !plansQuery.isError;

  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);

  return {
    eligible,
    reason,
    open: () => {
      if (!eligible) return;
      if (action.errorMessage) action.dismiss();
      resetDraft();
      void setParams({ open: true });
    },
    dialog: {
      open: params.open,
      accountLabel: activeAccount ? accountScopeLabel(activeAccount) : scope.value.accountId || '—',
      name: draft.name,
      onNameChange: (name) => setDraft((prev) => ({ ...prev, name })),
      nameError: fieldErrors.nameError,
      billingIdentity: draft.billingIdentity,
      onBillingIdentityChange: (billingIdentity) =>
        setDraft((prev) => ({ ...prev, billingIdentity })),
      billingIdentityError: fieldErrors.billingIdentityError,
      plans,
      plansLoading: plansQuery.isLoading,
      plansError: plansQuery.isError ? "Couldn't load billing plans." : undefined,
      onRetryPlans: () => void plansQuery.refetch(),
      planId: resolvedPlanId,
      onPlanChange: (planId) => setDraft((prev) => ({ ...prev, planId })),
      submitting: action.isPending,
      error: fieldErrors.error,
      canSubmit,
      onSubmit: () => {
        if (!canSubmit) return;
        action.mutate();
      },
      onCancel: () => {
        // Only clears the shared mutation entry when there is an ERROR to clear — mirrors
        // `use-api-keys-screen.ts`'s `createKeyDialog.onCancel`.
        if (action.errorMessage) action.dismiss();
        resetDraft();
        void setParams({ open: false });
      },
    },
  };
}

/**
 * The `+ New project` trigger, for every call site that is not `app/(console)/layout.tsx` itself
 * — `/projects`' own `PageHeader` action, `/settings/projects`' own `PageHeader` action, and the
 * inspector rail's quick-settings row.
 */
export function useOpenCreateProjectDialog(): {
  open: () => void;
  eligible: boolean;
  reason: string | undefined;
} {
  const [, setParams] = useCreateProjectDialogParams();
  const { eligible, reason } = useCreateProjectEligibility();

  return {
    eligible,
    reason,
    open: () => {
      if (!eligible) return;
      void setParams({ open: true });
    },
  };
}
