/**
 * `getBudgetPolicyStatus`'s own two readable fields (`BudgetPolicyStatus.policySetId` /
 * `.activePolicyRevision`, `packages/authz-rpc/schema/authz.cstack`) — the part of the refill
 * policy lifecycle that genuinely has a read API, as distinct from the rule CONTENT of that
 * revision, which does not (`REFILL_OPTIONS_DISABLED_REASON`, `converse-frontends#368`). `ready`
 * requires a `policySetId` to call with — the container supplying one (there is no discovery
 * procedure for it today) is what makes `unavailable` the honest default until it does.
 */
export type RefillPolicyStatusState =
  | { status: 'ready'; policySetId: string; activeRevision: string }
  | { status: 'loading' }
  | { status: 'error'; errorMessage?: string; onRetry?: () => void }
  | { status: 'unavailable'; caption: string };

export interface RefillPolicyStatusStripProps {
  state: RefillPolicyStatusState;
  className?: string;
}
