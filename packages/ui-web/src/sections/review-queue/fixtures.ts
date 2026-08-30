// admin-budget-review.svg — the 4-row pending queue shown in the mockup. `project`/`account` are
// resolved display names (never ids) — see `types.ts`'s own comment on `RefillRequestRow`.

import type { RefillRequestRow } from './types';

export const pendingRequestsFixture: RefillRequestRow[] = [
  { id: 'gateway-prod', submittedAgo: '3 d ago', project: 'gateway-prod', account: 'adorsys-gis', requestedAmount: 250 },
  { id: 'batch-eval', submittedAgo: '2 d ago', project: 'batch-eval', account: 'adorsys-gis', requestedAmount: 100 },
  { id: 'support-copilot', submittedAgo: '18 h ago', project: 'support-copilot', account: 'adorsys-labs', requestedAmount: 100 },
  { id: 'agent-sandbox', submittedAgo: '2 h ago', project: 'agent-sandbox', account: 'adorsys-labs', requestedAmount: 500 },
];
