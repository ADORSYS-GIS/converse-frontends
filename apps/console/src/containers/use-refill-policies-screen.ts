'use client';

import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import {
  createBlankRuleSet,
  createBlankScenario,
  dollarsToMicros,
  formatUsd,
  NO_POLICY_SET_ID_CAPTION,
  toRuleDataJson,
  toScenarioJson,
  validateRuleSet,
  validateScenario,
} from '@lightbridge/ui-web';
import type {
  PolicySimulationResult,
  RefillPolicyStatusState,
  RuleSetErrors,
  RuleSetValue,
  ScenarioErrors,
  ScenarioValue,
} from '@lightbridge/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  ADMIN_REFILL_POLICIES_MODE_OPTIONS,
  useAdminRefillPoliciesParams,
} from '../client/url-state';
import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { microsToAmount } from './refill-rows';
import {
  BUDGET_HOME_ACCOUNT_ONLY_NOTE,
  sortedAllowedAmountsMicros,
  useBudgetRefillLadder,
} from './use-budget-refill';
import { useTranslation } from '../i18n/client';

/**
 * `/admin/refill-policies` (owner ruling, verbatim: "Refill options are for admins only. Not
 * normal users. And we don't 'Simulate' them on the same page where we create them.
 * /admin/refill-policies should be for listing them /admin/refill-policies?create=true or
 * /admin/refill-policies?edit=<id> to create or edit, respectively, /admin/refill-
 * policies?simulate=<id> to simulate." — converse-frontends#368) — the mode-split screen data
 * adapter. **Two modes off this route now, never composed together** (owner review round 2,
 * 2026-08-31, converse-frontends#368 finding #4, verbatim: "You made out of
 * /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But it's
 * fine. Just move it to a page /admin/refill-policies/create" — create moved to its OWN route,
 * `/admin/refill-policies/create` (`use-refill-policy-create-screen.ts`, a sibling hook with its
 * own local state and no nuqs mode param to derive from — there is nothing left to compose
 * against on that route). `edit`/`simulate` are unchanged, the owner having named only create):
 *
 *  - `list` (bare path) — the honestly listable facts: a policy set's status
 *    (`getBudgetPolicyStatus`, behind `RefillPolicyLookup`'s own id lookup — there is no
 *    procedure that lists which policy sets exist), the caller's own current refill ladder
 *    (`useBudgetRefillLadder`, unchanged from the old `/settings/refill-options`), and the
 *    `RefillPolicyManual` explainer. Its own "+ New policy" action is a plain `Link` to
 *    `/admin/refill-policies/create` now, not a mode switch (`admin-refill-policies-centre.tsx`).
 *  - `edit` (`?edit=<id>`) — `RefillPolicyFormView`, honestly labelled "author a replacement
 *    revision for <id>": the current revision's CONTENT cannot be loaded (no read API,
 *    `converse-frontends#368`), so this always starts from a blank draft, never a fake prefill.
 *    Shares `RefillPolicyFormView` with the create route (`admin-refill-policies-centre.tsx`
 *    exports it) — same form, two different screen-data adapters feeding it.
 *  - `simulate` (`?simulate=<id>`) — `PolicySimulator` (`RuleSetForm` + `ScenarioForm` + decision
 *    readout via `simulateBudgetPolicy`, stateless — the procedure takes no `policySetId` at all,
 *    so `<id>` is display context only). Never rendered alongside `edit` — the owner's whole point
 *    in splitting this into separate URL modes/routes.
 */

export type AdminRefillPoliciesMode = 'list' | 'edit' | 'simulate';

export type RefillLadderState =
  | { status: 'ready'; amounts: string[] }
  | { status: 'empty'; caption: string }
  | { status: 'unavailable'; caption: string }
  | { status: 'loading' }
  | { status: 'error'; errorMessage?: string; onRetry?: () => void };

export interface AdminRefillPoliciesListScreen {
  policySetId: string;
  onPolicySetIdChange: (value: string) => void;
  status: RefillPolicyStatusState;
  onEditRevision?: () => void;
  onSimulate?: () => void;
  ladder: RefillLadderState;
  manualOpen: boolean;
  onManualOpenChange: (open: boolean) => void;
}

/**
 * "Start from example policy" (issue #445) — CREATE-ONLY, by construction rather than by a flag:
 * only `useRefillPolicyCreateScreen` returns this object, and `RefillPolicyFormView` renders the
 * action only when it is present. The edit route, which authors a replacement revision for a policy
 * set that already exists, never offers to overwrite that draft with a sample.
 *
 * `onStart` is the button's own handler and owns the dirty check: on a pristine form it fills
 * immediately, on a dirty one it opens the confirmation instead of silently discarding what the
 * admin typed. `confirmOpen`/`onConfirm`/`onCancelConfirm` drive that `ConfirmDialog`.
 */
export interface StartFromExampleAction {
  onStart: () => void;
  confirmOpen: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}

export interface AdminRefillPoliciesFormScreen {
  mode: 'create' | 'edit';
  /** Create-only — `undefined` on the edit route (see `StartFromExampleAction`). */
  startFromExample?: StartFromExampleAction;
  /** `undefined` in `edit` mode — the id comes straight from `?edit=<id>`, never retargeted. */
  policySetId: string;
  onPolicySetIdChange?: (value: string) => void;
  policySetIdReadOnly: boolean;
  ruleSet: RuleSetValue;
  onRuleSetChange: (value: RuleSetValue) => void;
  ruleSetErrors?: RuleSetErrors;
  canSubmit: boolean;
  activating: boolean;
  activateError?: string;
  onActivate: () => void;
  savingRevision: boolean;
  saveRevisionError?: string;
  savedRevision?: { revisionId: string; policyRevision: string };
  onSaveRevisionOnly: () => void;
  onCancel: () => void;
}

export interface AdminRefillPoliciesSimulateScreen {
  policySetId: string;
  ruleSet: RuleSetValue;
  onRuleSetChange: (value: RuleSetValue) => void;
  ruleSetErrors?: RuleSetErrors;
  scenario: ScenarioValue;
  onScenarioChange: (value: ScenarioValue) => void;
  scenarioErrors?: ScenarioErrors;
  requestedAmount: string;
  onRequestedAmountChange: (value: string) => void;
  submitting: boolean;
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  result?: PolicySimulationResult;
  onBack: () => void;
}

export interface AdminRefillPoliciesScreen {
  mode: AdminRefillPoliciesMode;
  scopeLabel: string | undefined;
  list: AdminRefillPoliciesListScreen;
  form: AdminRefillPoliciesFormScreen;
  simulate: AdminRefillPoliciesSimulateScreen;
}

export function useRefillPoliciesScreen(): AdminRefillPoliciesScreen {
  const { t } = useTranslation('admin');
  const scope = useConsoleScope();
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();
  const [view, setView] = useAdminRefillPoliciesParams();

  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);
  const scopeLabel = activeAccount ? accountScopeLabel(activeAccount) : undefined;

  const mode: AdminRefillPoliciesMode =
    view.editPolicySetId !== '' ? 'edit' : view.simulatePolicySetId !== '' ? 'simulate' : 'list';

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — an ephemeral interaction). The "how does it
   * work" explainer's open/closed state is chrome interaction, not view state a colleague needs a
   * link to reproduce.
   */
  const [manualOpen, setManualOpen] = useState(false);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — pre-submit form drafts that must never reach a
   * URL or history, the same shape `use-create-account-dialog.ts`'s unsent name draft already
   * uses): `formRuleSet` is the edit form's own `RuleSetForm` draft — always authored fresh, since
   * there is no read API to prefill an edit FROM (`converse-frontends#368`). (Create moved to its
   * own route and its own sibling hook, `use-refill-policy-create-screen.ts` — its identical draft
   * lives there now, not here.) The remaining five track the two real write calls this form fires
   * (`activateBudgetPolicy`/`createBudgetPolicyRevision`) — outcomes only THIS view renders, so a
   * plain local mutation state, not `useSharedMutation`'s cross-zone cache.
   */
  const [formRuleSet, setFormRuleSet] = useState<RuleSetValue>(createBlankRuleSet());
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | undefined>(undefined);
  // SANCTIONED LOCAL STATE (cont'd) — the `createBudgetPolicyRevision` outcome, same reasoning.
  const [savingRevision, setSavingRevision] = useState(false);
  const [saveRevisionError, setSaveRevisionError] = useState<string | undefined>(undefined);
  const [savedRevision, setSavedRevision] = useState<
    { revisionId: string; policyRevision: string } | undefined
  >(undefined);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — the identical `simulateBudgetPolicy` scratch
   * pad `use-refill-options-screen.ts` used to hold): nothing here is shareable view state, since
   * a simulation reads no stored policy and changes nothing — `?simulate=<id>` names the CONTEXT,
   * not this draft.
   */
  const [simulateRuleSet, setSimulateRuleSet] = useState<RuleSetValue>(createBlankRuleSet());
  const [simulateScenario, setSimulateScenario] = useState<ScenarioValue>(createBlankScenario());
  const [simulateRequestedAmount, setSimulateRequestedAmount] = useState('');
  const [simulateResult, setSimulateResult] = useState<PolicySimulationResult | undefined>(
    undefined
  );
  const [simulateError, setSimulateError] = useState<string | undefined>(undefined);
  const [simulateSubmitting, setSimulateSubmitting] = useState(false);

  // ── navigation ────────────────────────────────────────────────────────────────────────────

  const goList = (lookupPolicySetId?: string) =>
    void setView(
      {
        editPolicySetId: '',
        simulatePolicySetId: '',
        ...(lookupPolicySetId !== undefined ? { policySetId: lookupPolicySetId } : {}),
      },
      ADMIN_REFILL_POLICIES_MODE_OPTIONS
    );

  const onEditRevision = () => {
    const targetId = view.policySetId.trim();
    if (targetId === '') return;
    setFormRuleSet(createBlankRuleSet());
    setActivateError(undefined);
    setSaveRevisionError(undefined);
    setSavedRevision(undefined);
    void setView(
      { editPolicySetId: targetId, simulatePolicySetId: '' },
      ADMIN_REFILL_POLICIES_MODE_OPTIONS
    );
  };

  const onSimulate = () => {
    const targetId = view.policySetId.trim();
    if (targetId === '') return;
    setSimulateRuleSet(createBlankRuleSet());
    setSimulateScenario(createBlankScenario());
    setSimulateRequestedAmount('');
    setSimulateResult(undefined);
    setSimulateError(undefined);
    void setView(
      { editPolicySetId: '', simulatePolicySetId: targetId },
      ADMIN_REFILL_POLICIES_MODE_OPTIONS
    );
  };

  // ── list mode ─────────────────────────────────────────────────────────────────────────────

  const trimmedLookupId = view.policySetId.trim();
  const statusQuery = useQuery({
    queryKey: ['budget', 'policyStatus', trimmedLookupId],
    queryFn: () =>
      budgetClient.procedures.getBudgetPolicyStatus({ args: { policySetId: trimmedLookupId } }),
    enabled: mode === 'list' && trimmedLookupId !== '',
    staleTime: 15_000,
  });

  let status: RefillPolicyStatusState;
  if (trimmedLookupId === '') {
    status = { status: 'unavailable', caption: NO_POLICY_SET_ID_CAPTION };
  } else if (statusQuery.isPending) {
    status = { status: 'loading' };
  } else if (statusQuery.isError) {
    status = {
      status: 'error',
      errorMessage: getApiErrorMessage(statusQuery.error),
      onRetry: () => void statusQuery.refetch(),
    };
  } else if (statusQuery.data) {
    status = {
      status: 'ready',
      policySetId: statusQuery.data.policySetId,
      activeRevision: statusQuery.data.activePolicyRevision,
    };
  } else {
    status = { status: 'unavailable', caption: NO_POLICY_SET_ID_CAPTION };
  }

  const ladderQuery = useBudgetRefillLadder();
  const sortedAmounts = sortedAllowedAmountsMicros(ladderQuery.allowedAmountsMicros);
  let ladder: RefillLadderState;
  if (ladderQuery.unavailable) {
    ladder = { status: 'unavailable', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
  } else if (ladderQuery.loading) {
    ladder = { status: 'loading' };
  } else if (ladderQuery.error) {
    ladder = {
      status: 'error',
      errorMessage: t('refill-policies.ladder-load-failed'),
      onRetry: ladderQuery.refetch,
    };
  } else if (sortedAmounts.length === 0) {
    ladder = {
      status: 'empty',
      caption: t('refill-policies.ladder-no-amount'),
    };
  } else {
    ladder = {
      status: 'ready',
      amounts: sortedAmounts.map((value) => `+${formatUsd(microsToAmount(value))}`),
    };
  }

  // ── edit mode ─────────────────────────────────────────────────────────────────────────────

  const formPolicySetId = view.editPolicySetId;
  const ruleSetErrors = validateRuleSet(formRuleSet);
  const formCanSubmit =
    formPolicySetId.trim() !== '' && ruleSetErrors === undefined && !activating && !savingRevision;

  const invalidatePolicyStatus = (policySetId: string) =>
    void queryClient.invalidateQueries({ queryKey: ['budget', 'policyStatus', policySetId] });

  const onActivate = () => {
    if (!formCanSubmit) return;
    const policySetId = formPolicySetId.trim();
    setActivating(true);
    setActivateError(undefined);
    budgetClient.procedures
      .activateBudgetPolicy({
        args: { policySetId, ruleDataJson: toRuleDataJson(formRuleSet) },
      })
      .then(() => {
        setActivating(false);
        invalidatePolicyStatus(policySetId);
        goList(policySetId);
      })
      .catch((cause: unknown) => {
        setActivating(false);
        setActivateError(getApiErrorMessage(cause));
      });
  };

  const onSaveRevisionOnly = () => {
    if (!formCanSubmit) return;
    const policySetId = formPolicySetId.trim();
    setSavingRevision(true);
    setSaveRevisionError(undefined);
    setSavedRevision(undefined);
    budgetClient.procedures
      .createBudgetPolicyRevision({
        args: { policySetId, ruleDataJson: toRuleDataJson(formRuleSet) },
      })
      .then((ref) => {
        setSavingRevision(false);
        setSavedRevision({ revisionId: ref.revisionId, policyRevision: ref.policyRevision });
      })
      .catch((cause: unknown) => {
        setSavingRevision(false);
        setSaveRevisionError(getApiErrorMessage(cause));
      });
  };

  // ── simulate mode ─────────────────────────────────────────────────────────────────────────

  const simulateRuleSetErrors = validateRuleSet(simulateRuleSet);
  const simulateScenarioErrors = validateScenario(simulateScenario);
  const requestedAmountMicros = dollarsToMicros(simulateRequestedAmount);
  const simulateCanSubmit =
    simulateRuleSetErrors === undefined &&
    simulateScenarioErrors === undefined &&
    requestedAmountMicros !== null &&
    !simulateSubmitting;

  const onSimulateSubmit = () => {
    if (requestedAmountMicros === null) return;
    setSimulateSubmitting(true);
    setSimulateError(undefined);
    budgetClient.procedures
      .simulateBudgetPolicy({
        args: {
          ruleDataJson: toRuleDataJson(simulateRuleSet),
          scenarioJson: toScenarioJson(simulateScenario),
          requestedAmountMicros: String(requestedAmountMicros),
        },
      })
      .then((decision) => {
        setSimulateSubmitting(false);
        setSimulateResult({
          effect: decision.effect,
          approvedAmount: microsToAmount(decision.approvedAmountMicros),
          maximumAmount: microsToAmount(decision.maximumAmountMicros),
          reasonCodes: decision.reasonCodes,
          matchedRuleIds: decision.matchedRuleIds,
          policyRevision: decision.policyRevision,
          requiredApproverRole: decision.obligations?.requiredApproverRole,
        });
      })
      .catch((cause: unknown) => {
        setSimulateSubmitting(false);
        setSimulateResult(undefined);
        setSimulateError(getApiErrorMessage(cause));
      });
  };

  return {
    mode,
    scopeLabel,
    list: {
      policySetId: view.policySetId,
      onPolicySetIdChange: (value) => void setView({ policySetId: value }),
      status,
      onEditRevision: status.status === 'ready' ? onEditRevision : undefined,
      onSimulate: status.status === 'ready' ? onSimulate : undefined,
      ladder,
      manualOpen,
      onManualOpenChange: setManualOpen,
    },
    form: {
      mode: 'edit',
      policySetId: formPolicySetId,
      onPolicySetIdChange: undefined,
      policySetIdReadOnly: true,
      ruleSet: formRuleSet,
      onRuleSetChange: (value) => {
        setFormRuleSet(value);
        setSavedRevision(undefined);
      },
      ruleSetErrors,
      canSubmit: formCanSubmit,
      activating,
      activateError,
      onActivate,
      savingRevision,
      saveRevisionError,
      savedRevision,
      onSaveRevisionOnly,
      onCancel: () => goList(),
    },
    simulate: {
      policySetId: view.simulatePolicySetId,
      ruleSet: simulateRuleSet,
      onRuleSetChange: (value) => {
        setSimulateRuleSet(value);
        setSimulateResult(undefined);
      },
      ruleSetErrors: simulateRuleSetErrors,
      scenario: simulateScenario,
      onScenarioChange: (value) => {
        setSimulateScenario(value);
        setSimulateResult(undefined);
      },
      scenarioErrors: simulateScenarioErrors,
      requestedAmount: simulateRequestedAmount,
      onRequestedAmountChange: (value) => {
        setSimulateRequestedAmount(value);
        setSimulateResult(undefined);
      },
      submitting: simulateSubmitting,
      error: simulateError,
      canSubmit: simulateCanSubmit,
      onSubmit: onSimulateSubmit,
      result: simulateResult,
      onBack: () => goList(),
    },
  };
}
