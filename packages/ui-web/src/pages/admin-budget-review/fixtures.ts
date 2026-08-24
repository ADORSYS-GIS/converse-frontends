import type { NavSpineItem } from '../../components/nav-spine';
import type { ReviewHistoryRow } from '../../components/review-detail-panel';
import type { SubNavItem } from '../../components/sub-nav';
import type { DecisionRow, RefillRequestRow } from './types';

// admin-budget-review.svg — the 4-row pending queue shown in the mockup.
export const pendingRequestsFixture: RefillRequestRow[] = [
  { id: 'gateway-prod', submittedAgo: '3 d ago', project: 'gateway-prod', account: 'adorsys-gis', consumed: 455.2, ceiling: 500, requestedAmount: 250, requesterEmail: 'ada@adorsys.com' },
  { id: 'batch-eval', submittedAgo: '2 d ago', project: 'batch-eval', account: 'adorsys-gis', consumed: 231.44, ceiling: 250, requestedAmount: 100, requesterEmail: 'joel@adorsys.com' },
  { id: 'support-copilot', submittedAgo: '18 h ago', project: 'support-copilot', account: 'adorsys-labs', consumed: 139.02, ceiling: 150, requestedAmount: 100, requesterEmail: 'nina@adorsys.com' },
  { id: 'agent-sandbox', submittedAgo: '2 h ago', project: 'agent-sandbox', account: 'adorsys-labs', consumed: 33.1, ceiling: 100, requestedAmount: 500, requesterEmail: 'joel@adorsys.com' },
];

// admin-budget-review.svg — the RECENT DECISIONS ledger tail (6 of 26 shown).
export const recentDecisionsFixture: DecisionRow[] = [
  { id: 'd1', date: '2026-02-19', project: 'rag-catalogue', account: 'adorsys-gis', amount: 250, decision: 'approved', decidedBy: 'sam' },
  { id: 'd2', date: '2026-02-17', project: 'voice-transcribe', account: 'adorsys-labs', amount: 500, decision: 'declined', decidedBy: 'sam' },
  { id: 'd3', date: '2026-02-14', project: 'gateway-edge', account: 'adorsys-gis', amount: 100, decision: 'approved', decidedBy: 'maya' },
  { id: 'd4', date: '2026-02-11', project: 'doc-extract', account: 'adorsys-labs', amount: 100, decision: 'approved', decidedBy: 'maya' },
  { id: 'd5', date: '2026-02-08', project: 'gateway-prod', account: 'adorsys-gis', amount: 250, decision: 'approved', decidedBy: 'sam' },
  { id: 'd6', date: '2026-02-03', project: 'translate-batch', account: 'adorsys-emea', amount: 100, decision: 'declined', decidedBy: 'maya' },
];

export const adminNavItems: NavSpineItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'api-keys', label: 'Api-Keys' },
  { key: 'manage', label: 'Manage' },
];

export const adminAdminNavItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin', active: true }];

export const adminSubNavItems: SubNavItem[] = [
  { key: 'budget-review', label: 'Budget review', count: 4, active: true },
  { key: 'org-config', label: 'Org config' },
  { key: 'roles', label: 'Roles', count: 3 },
];

export const gatewayProdHistory: ReviewHistoryRow[] = [
  { id: 'h1', label: '2 previous refills', amount: 350, meta: 'last 2026-02-08 · approved by sam' },
];
