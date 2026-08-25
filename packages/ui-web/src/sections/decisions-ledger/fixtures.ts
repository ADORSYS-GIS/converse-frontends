// admin-budget-review.svg — the RECENT DECISIONS ledger tail (6 of 26 shown). Moved here
// verbatim from the deleted `pages/admin-budget-review/fixtures.ts`.

import type { DecisionRow } from './types';

export const recentDecisionsFixture: DecisionRow[] = [
  { id: 'd1', date: '2026-02-19', project: 'rag-catalogue', account: 'adorsys-gis', amount: 250, decision: 'approved', decidedBy: 'sam' },
  { id: 'd2', date: '2026-02-17', project: 'voice-transcribe', account: 'adorsys-labs', amount: 500, decision: 'declined', decidedBy: 'sam' },
  { id: 'd3', date: '2026-02-14', project: 'gateway-edge', account: 'adorsys-gis', amount: 100, decision: 'approved', decidedBy: 'maya' },
  { id: 'd4', date: '2026-02-11', project: 'doc-extract', account: 'adorsys-labs', amount: 100, decision: 'approved', decidedBy: 'maya' },
  { id: 'd5', date: '2026-02-08', project: 'gateway-prod', account: 'adorsys-gis', amount: 250, decision: 'approved', decidedBy: 'sam' },
  { id: 'd6', date: '2026-02-03', project: 'translate-batch', account: 'adorsys-emea', amount: 100, decision: 'declined', decidedBy: 'maya' },
];
