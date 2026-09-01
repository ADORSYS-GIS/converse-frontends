import type { RefillHistoryState } from './types';

export const refillHistoryReady: RefillHistoryState = {
  status: 'ready',
  rows: [
    { id: 'req_1', submittedAgo: '2 days ago', amount: 12, statusLabel: 'Pending review' },
    { id: 'req_2', submittedAgo: '9 days ago', amount: 5, statusLabel: 'Approved' },
    { id: 'req_3', submittedAgo: '18 days ago', amount: 25, statusLabel: 'Declined' },
  ],
};

export const refillHistoryEmpty: RefillHistoryState = { status: 'ready', rows: [] };

export const refillHistoryLoading: RefillHistoryState = { status: 'loading' };

export const refillHistoryError: RefillHistoryState = {
  status: 'error',
  errorMessage: 'Could not load your refill history.',
  onRetry: () => undefined,
};

export const refillHistoryUnavailable: RefillHistoryState = {
  status: 'unavailable',
  caption:
    'Budget balance and refill requests are only available for your home account today — see ' +
    'lightbridge-authz#577.',
};
