import type {
  RefillRequestFormError,
  RefillRequestFormReady,
  RefillRequestFormState,
} from './types';

// Typed as the concrete `Ready` branch, not the `RefillRequestFormState` union — spreading a
// union-typed base object loses per-branch property knowledge, which is what made the
// `submitting`/`onRetry` overrides below fail as "unknown property" against the wrong branch.
export const refillFormReady: RefillRequestFormReady = {
  status: 'ready',
  amountOptions: [
    { value: '5000000', label: '+$5.00' },
    { value: '12000000', label: '+$12.00' },
    { value: '25000000', label: '+$25.00' },
  ],
  amountMicros: '5000000',
  onAmountChange: () => undefined,
  submitting: false,
  canSubmit: true,
  onSubmit: () => undefined,
};

export const refillFormSubmitting: RefillRequestFormState = {
  ...refillFormReady,
  submitting: true,
  canSubmit: false,
};

export const refillFormSubmitError: RefillRequestFormState = {
  ...refillFormReady,
  error: 'The request could not be sent — try again.',
};

export const refillFormEmpty: RefillRequestFormState = {
  status: 'empty',
  caption: 'The active refill policy currently offers no amount for this account.',
};

export const refillFormUnavailable: RefillRequestFormState = {
  status: 'unavailable',
  caption:
    'Budget balance and refill requests are only available for your home account today — see ' +
    'lightbridge-authz#577.',
};

export const refillFormLoading: RefillRequestFormState = { status: 'loading' };

export const refillFormError: RefillRequestFormError = {
  status: 'error',
  errorMessage: 'Could not load the refill policy.',
  onRetry: () => undefined,
};
