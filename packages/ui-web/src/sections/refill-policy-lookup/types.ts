import type { RefillPolicyStatusState } from '../refill-policy-status-strip';

export interface RefillPolicyLookupProps {
  /** The policy set id currently typed into the lookup field — URL-backed (debounced, the same
   *  idiom every other free-text filter in this console uses), never local scratch, since "which
   *  policy set am I looking at" is exactly the shareable view-state ADR 0011 puts in the URL. */
  value: string;
  onChange: (value: string) => void;
  /** `getBudgetPolicyStatus`'s own result for `value` — `unavailable` (with
   *  `NO_POLICY_SET_ID_CAPTION`) until the caller has a non-empty id to look up. */
  status: RefillPolicyStatusState;
  /** Present only once `status` is `'ready'` — omitted rather than rendered disabled, so there is
   *  never a control that looks live and does nothing. */
  onEditRevision?: () => void;
  onSimulate?: () => void;
  className?: string;
}
