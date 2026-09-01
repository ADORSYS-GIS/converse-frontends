export interface RefillAmountOption {
  value: string;
  label: string;
}

export interface RefillRequestFormReady {
  status: 'ready';
  amountOptions: RefillAmountOption[];
  amountMicros: string;
  onAmountChange: (amountMicros: string) => void;
  submitting: boolean;
  /** A submit-time failure. Kept inline; the form stays on screen. */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
}

/** The active policy settled but currently offers no amount — distinct from `unavailable`
 *  (there is no policy question to answer at all for this account). */
export interface RefillRequestFormEmpty {
  status: 'empty';
  caption: string;
}

/** A non-home scoped account — `getMyBudgetRefillLadder` cannot answer for it at all. See
 *  `use-budget-refill.ts`'s `BUDGET_HOME_ACCOUNT_ONLY_NOTE` in `apps/console`. */
export interface RefillRequestFormUnavailable {
  status: 'unavailable';
  caption: string;
}

export interface RefillRequestFormLoading {
  status: 'loading';
}

export interface RefillRequestFormError {
  status: 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

export type RefillRequestFormState =
  | RefillRequestFormReady
  | RefillRequestFormEmpty
  | RefillRequestFormUnavailable
  | RefillRequestFormLoading
  | RefillRequestFormError;

export interface RefillRequestFormProps {
  state: RefillRequestFormState;
  className?: string;
}
