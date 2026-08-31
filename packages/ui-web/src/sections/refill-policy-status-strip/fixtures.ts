import type { RefillPolicyStatusStripProps } from './types';

export const refillPolicyStatusReady: RefillPolicyStatusStripProps = {
  state: { status: 'ready', policySetId: 'budget-refill', activeRevision: 'budget-policy-v1' },
};

export const refillPolicyStatusLoading: RefillPolicyStatusStripProps = {
  state: { status: 'loading' },
};

export const refillPolicyStatusError: RefillPolicyStatusStripProps = {
  state: { status: 'error', errorMessage: 'Could not load the active policy status.' },
};

export const refillPolicyStatusUnavailable: RefillPolicyStatusStripProps = {
  state: {
    status: 'unavailable',
    caption:
      'No known policy set id to check yet — there is no discovery procedure for one today (converse-frontends#368).',
  },
};
