// admin-budget-review.svg — the 4-row pending queue shown in the mockup. Moved here verbatim
// from the deleted `pages/admin-budget-review/fixtures.ts`.

import type { RefillRequestRow } from './types';

export const pendingRequestsFixture: RefillRequestRow[] = [
  { id: 'gateway-prod', submittedAgo: '3 d ago', project: 'gateway-prod', account: 'adorsys-gis', consumed: 455.2, ceiling: 500, requestedAmount: 250, requesterEmail: 'ada@adorsys.com' },
  { id: 'batch-eval', submittedAgo: '2 d ago', project: 'batch-eval', account: 'adorsys-gis', consumed: 231.44, ceiling: 250, requestedAmount: 100, requesterEmail: 'joel@adorsys.com' },
  { id: 'support-copilot', submittedAgo: '18 h ago', project: 'support-copilot', account: 'adorsys-labs', consumed: 139.02, ceiling: 150, requestedAmount: 100, requesterEmail: 'nina@adorsys.com' },
  { id: 'agent-sandbox', submittedAgo: '2 h ago', project: 'agent-sandbox', account: 'adorsys-labs', consumed: 33.1, ceiling: 100, requestedAmount: 500, requesterEmail: 'joel@adorsys.com' },
];
