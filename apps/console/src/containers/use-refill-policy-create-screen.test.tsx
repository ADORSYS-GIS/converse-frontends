import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBlankRuleSet,
  createExampleRuleSet,
  EXAMPLE_POLICY_SET_ID,
  validateRuleSet,
} from '@lightbridge/ui-web';

/**
 * "Start from example policy" (issue #445) — the dirty gate, which is the only real logic this
 * route's hook grew: a pristine form fills straight away, a dirty one asks before discarding what
 * the admin typed. The three ambient dependencies (`rpc-clients`, react-query, the router) are
 * mocked wholesale; none of them is touched by the paths under test here.
 */
vi.mock('../client/rpc-clients', () => ({
  useConsoleBudgetClient: () => ({ procedures: {} }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { useRefillPolicyCreateScreen } = await import('./use-refill-policy-create-screen');

describe('useRefillPolicyCreateScreen — start from example policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers the action — this is the create route, the only one that may', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    expect(result.current.startFromExample).toBeDefined();
    expect(result.current.startFromExample?.confirmOpen).toBe(false);
  });

  it('fills the whole form straight away while the draft is still pristine', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.startFromExample?.onStart());

    expect(result.current.startFromExample?.confirmOpen).toBe(false);
    expect(result.current.policySetId).toBe(EXAMPLE_POLICY_SET_ID);
    expect(result.current.ruleSet.allowedAmounts).toEqual(['2', '5', '10', '25']);
    expect(result.current.ruleSet.rules).toHaveLength(3);
  });

  it('leaves the filled draft submittable without a single further edit', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.startFromExample?.onStart());

    expect(result.current.ruleSetErrors).toBeUndefined();
    expect(validateRuleSet(result.current.ruleSet)).toBeUndefined();
    expect(result.current.canSubmit).toBe(true);
  });

  it('asks first once the admin has typed something, rather than discarding it silently', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.onPolicySetIdChange?.('my-own-policy'));
    act(() => result.current.startFromExample?.onStart());

    expect(result.current.startFromExample?.confirmOpen).toBe(true);
    // Nothing is overwritten until the question is answered.
    expect(result.current.policySetId).toBe('my-own-policy');
  });

  it('treats a rule-set edit as dirty too, not just the id field', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() =>
      result.current.onRuleSetChange({ ...createBlankRuleSet(), policyRevision: 'mine-v1' })
    );
    act(() => result.current.startFromExample?.onStart());

    expect(result.current.startFromExample?.confirmOpen).toBe(true);
    expect(result.current.ruleSet.policyRevision).toBe('mine-v1');
  });

  it('overwrites on confirm and closes the question', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.onPolicySetIdChange?.('my-own-policy'));
    act(() => result.current.startFromExample?.onStart());
    act(() => result.current.startFromExample?.onConfirm());

    expect(result.current.startFromExample?.confirmOpen).toBe(false);
    expect(result.current.policySetId).toBe(EXAMPLE_POLICY_SET_ID);
    expect(result.current.ruleSet.policyRevision).toBe(createExampleRuleSet().policyRevision);
  });

  it('keeps the draft untouched on cancel', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.onPolicySetIdChange?.('my-own-policy'));
    act(() => result.current.startFromExample?.onStart());
    act(() => result.current.startFromExample?.onCancelConfirm());

    expect(result.current.startFromExample?.confirmOpen).toBe(false);
    expect(result.current.policySetId).toBe('my-own-policy');
    expect(result.current.ruleSet).toEqual(createBlankRuleSet());
  });

  it('asks again on a second press — the example itself leaves the form dirty', () => {
    const { result } = renderHook(() => useRefillPolicyCreateScreen());

    act(() => result.current.startFromExample?.onStart());
    act(() => result.current.startFromExample?.onStart());

    expect(result.current.startFromExample?.confirmOpen).toBe(true);
  });
});
