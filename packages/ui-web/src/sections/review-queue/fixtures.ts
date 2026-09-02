// admin-budget-review.svg — the 4-row pending queue shown in the mockup. `project`/`account` are
// resolved display names (never ids) — see `types.ts`'s own comment on `RefillRequestRow`.
//
// `requester` (converse-frontends#444) covers the three states a real page mixes: two identities
// resolved from `resolveUserProfiles` (one with an email, one whose federated identity carries
// none — every profile field but `userId` is independently nullable), one pre-migration row whose
// `requestedByUserId` is permanently NULL, and one id the batch returned no identity for.

import type { RefillRequestRow } from './types';

export const pendingRequestsFixture: RefillRequestRow[] = [
  {
    id: 'gateway-prod',
    submittedAgo: '3 d ago',
    project: 'gateway-prod',
    account: 'adorsys-gis',
    requester: { kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' },
    requestedAmount: 250,
  },
  {
    id: 'batch-eval',
    submittedAgo: '2 d ago',
    project: 'batch-eval',
    account: 'adorsys-gis',
    requester: { kind: 'user', name: 'tobias.lang' },
    requestedAmount: 100,
  },
  {
    id: 'support-copilot',
    submittedAgo: '18 h ago',
    project: 'support-copilot',
    account: 'adorsys-labs',
    requester: { kind: 'unknown' },
    requestedAmount: 100,
  },
  {
    id: 'agent-sandbox',
    submittedAgo: '2 h ago',
    project: 'agent-sandbox',
    account: 'adorsys-labs',
    requester: { kind: 'unresolved', userId: 'usr_k3m9x1qp0z7v' },
    requestedAmount: 500,
  },
];
