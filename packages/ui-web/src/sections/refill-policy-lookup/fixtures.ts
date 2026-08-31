import { NO_POLICY_SET_ID_CAPTION } from '../refill-policy-status-strip';
import type { RefillPolicyLookupProps } from './types';

const noop = () => undefined;

export const refillPolicyLookupEmpty: RefillPolicyLookupProps = {
  value: '',
  onChange: noop,
  status: { status: 'unavailable', caption: NO_POLICY_SET_ID_CAPTION },
};

export const refillPolicyLookupLoading: RefillPolicyLookupProps = {
  value: 'budget-refill',
  onChange: noop,
  status: { status: 'loading' },
};

export const refillPolicyLookupReady: RefillPolicyLookupProps = {
  value: 'budget-refill',
  onChange: noop,
  status: { status: 'ready', policySetId: 'budget-refill', activeRevision: 'budget-policy-v1' },
  onEditRevision: noop,
  onSimulate: noop,
};

export const refillPolicyLookupError: RefillPolicyLookupProps = {
  value: 'budget-refill',
  onChange: noop,
  status: { status: 'error', errorMessage: 'Could not load the active policy status.' },
};
