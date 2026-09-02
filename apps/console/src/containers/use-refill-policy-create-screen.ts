'use client';

import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import {
  createBlankRuleSet,
  createExampleRuleSet,
  EXAMPLE_POLICY_SET_ID,
  toRuleDataJson,
  validateRuleSet,
} from '@lightbridge/ui-web';
import type { RuleSetValue } from '@lightbridge/ui-web';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import type { AdminRefillPoliciesFormScreen } from './use-refill-policies-screen';

/**
 * `/admin/refill-policies/create` (owner review round 2, 2026-08-31, converse-frontends#368
 * finding #4, verbatim): "You made out of /admin/refill-policies?create=true a full page.
 * Instead, I was thinking of a modal. But it's fine. Just move it to a page
 * /admin/refill-policies/create." — the sibling of `useRefillPoliciesScreen`'s own `edit` mode,
 * feeding the SAME `RefillPolicyFormView` (`admin-refill-policies-centre.tsx` exports it) with an
 * `AdminRefillPoliciesFormScreen` shape, but wired to this route's own local state rather than a
 * `?create=true` nuqs param — there is nothing left on `/admin/refill-policies` to derive a
 * "create" mode from any more (`use-refill-policies-screen.ts`'s own doc comment).
 *
 * `policySetId`/`ruleSet` and the two write paths (`activateBudgetPolicy`/
 * `createBudgetPolicyRevision`) are the exact same fields/calls `useRefillPoliciesScreen`'s old
 * create branch used — copied, not shared, since the two hooks now live on different routes with
 * no nuqs state to unify them through. `onActivate`'s success path navigates to
 * `/admin/refill-policies?policy-set=<id>` (the SAME `policy-set` url key
 * `adminRefillPoliciesUrlKeys` maps `policySetId` to) rather than a nuqs `setView`, since this
 * route has no `useAdminRefillPoliciesParams()` of its own to write through. `onCancel` is a plain
 * navigation back to the list, not a mode-clearing `setView` — there is no mode param here to
 * clear.
 */
export function useRefillPolicyCreateScreen(): AdminRefillPoliciesFormScreen {
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — pre-submit form drafts that must never reach a
  // URL or history): the id being typed for a policy set that does not exist yet, and the form's
  // own `RuleSetForm` draft — always authored fresh, there being no read API to prefill from. The
  // remaining five track the two real write calls this form fires, outcomes only this view
  // renders, so plain local mutation state rather than `useSharedMutation`'s cross-zone cache —
  // the identical shape `useRefillPoliciesScreen`'s own edit-mode state uses.
  const [policySetId, setPolicySetId] = useState('');
  const [ruleSet, setRuleSet] = useState<RuleSetValue>(createBlankRuleSet());
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | undefined>(undefined);
  const [savingRevision, setSavingRevision] = useState(false);
  const [saveRevisionError, setSaveRevisionError] = useState<string | undefined>(undefined);
  const [savedRevision, setSavedRevision] = useState<
    { revisionId: string; policyRevision: string } | undefined
  >(undefined);
  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — a pre-submit draft's own dirty bit and an
  // ephemeral confirmation flag; neither belongs in a URL or in history). "Start from example
  // policy" (issue #445): `touched` is a plain boolean flipped by the two change handlers rather
  // than a deep compare against `createBlankRuleSet()`, because the draft's rule rows carry
  // per-mount React keys (`RuleValue.key`, a fresh UUID) that would make a structural comparison
  // lie the moment a rule row is added and removed again.
  const [touched, setTouched] = useState(false);
  const [exampleConfirmOpen, setExampleConfirmOpen] = useState(false);

  const ruleSetErrors = validateRuleSet(ruleSet);
  const canSubmit =
    policySetId.trim() !== '' && ruleSetErrors === undefined && !activating && !savingRevision;

  const invalidatePolicyStatus = (id: string) =>
    void queryClient.invalidateQueries({ queryKey: ['budget', 'policyStatus', id] });

  const onActivate = () => {
    if (!canSubmit) return;
    const id = policySetId.trim();
    setActivating(true);
    setActivateError(undefined);
    budgetClient.procedures
      .activateBudgetPolicy({ args: { policySetId: id, ruleDataJson: toRuleDataJson(ruleSet) } })
      .then(() => {
        setActivating(false);
        invalidatePolicyStatus(id);
        router.push(`/admin/refill-policies?policy-set=${encodeURIComponent(id)}`);
      })
      .catch((cause: unknown) => {
        setActivating(false);
        setActivateError(getApiErrorMessage(cause));
      });
  };

  const onSaveRevisionOnly = () => {
    if (!canSubmit) return;
    const id = policySetId.trim();
    setSavingRevision(true);
    setSaveRevisionError(undefined);
    setSavedRevision(undefined);
    budgetClient.procedures
      .createBudgetPolicyRevision({
        args: { policySetId: id, ruleDataJson: toRuleDataJson(ruleSet) },
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

  // Fills BOTH the policy set id and the whole rule set from the one exported sample
  // (`createExampleRuleSet`, which `example-policy.test.ts` asserts `validateRuleSet` accepts
  // unchanged — so this button can never hand an admin a draft the form itself rejects). Any
  // stale outcome from a previous submit is cleared: those messages describe the draft that has
  // just been replaced.
  const applyExamplePolicy = () => {
    setPolicySetId(EXAMPLE_POLICY_SET_ID);
    setRuleSet(createExampleRuleSet());
    setSavedRevision(undefined);
    setActivateError(undefined);
    setSaveRevisionError(undefined);
    setTouched(true);
    setExampleConfirmOpen(false);
  };

  return {
    mode: 'create',
    startFromExample: {
      // Pristine form: fill straight away, there is nothing to lose. Dirty form: ask first —
      // this overwrites every field, including the id.
      onStart: () => (touched ? setExampleConfirmOpen(true) : applyExamplePolicy()),
      confirmOpen: exampleConfirmOpen,
      onConfirm: applyExamplePolicy,
      onCancelConfirm: () => setExampleConfirmOpen(false),
    },
    policySetId,
    onPolicySetIdChange: (value) => {
      setPolicySetId(value);
      setTouched(true);
    },
    policySetIdReadOnly: false,
    ruleSet,
    onRuleSetChange: (value) => {
      setRuleSet(value);
      setSavedRevision(undefined);
      setTouched(true);
    },
    ruleSetErrors,
    canSubmit,
    activating,
    activateError,
    onActivate,
    savingRevision,
    saveRevisionError,
    savedRevision,
    onSaveRevisionOnly,
    onCancel: () => router.push('/admin/refill-policies'),
  };
}
