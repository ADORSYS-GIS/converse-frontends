// Fixtures reflecting the measured shapes behind IA v3 phase 4's build list: a dominant-model
// account (one model at ~97% of spend — "top-1 ≥95% for half of accounts"), a sparse account
// (few active days, most rows at $0), and an estate overlay with more than `topN` contributors.

import type { RankedSeriesRow } from './types';

/** A single model handles almost everything — the common case, not the exception. Crosses the
 *  95% suppression threshold, so the story renders percentages as text, no share micro-bars. */
export const rankedRowsDominantModel: RankedSeriesRow[] = [
  {
    key: 'gpt-4o',
    label: 'gpt-4o',
    value: 96.4,
    formattedValue: '$96.40',
    sparklinePoints: [4, 6, 5, 9, 12, 14, 18, 22],
  },
  {
    key: 'gpt-4o-mini',
    label: 'gpt-4o-mini',
    value: 2.1,
    formattedValue: '$2.10',
    sparklinePoints: [0.3, 0.2, 0.4, 0.3, 0.5, 0.4, 0.3, 0.2],
  },
  {
    key: 'text-embedding-3-small',
    label: 'text-embedding-3-small',
    value: 0.9,
    formattedValue: '$0.90',
    sparklinePoints: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2],
  },
];

/** A sparse account: 5 active days out of 17, most models with real spend but a real zero-spend
 *  tail that collapses behind the disclosure line. */
export const rankedRowsSparseAccount: RankedSeriesRow[] = [
  { key: 'model-a', label: 'claude-opus-4', value: 4.2, formattedValue: '$4.20', sparklinePoints: [0, 0, 4.2] },
  { key: 'model-b', label: 'claude-haiku-4', value: 0.6, formattedValue: '$0.60', sparklinePoints: [0.6] },
  { key: 'model-c', label: 'unused-preview', value: 0, formattedValue: '$0.00' },
  { key: 'model-d', label: 'retired-model', value: 0, formattedValue: '$0.00' },
  { key: 'model-e', label: 'trial-model', value: 0, formattedValue: '$0.00' },
];

/** The estate overlay's own shape: 10 accounts, more than `topN` (8) — two fold into "Other". */
export const rankedRowsEstateAccounts: RankedSeriesRow[] = [
  { key: 'acct_1', label: 'nova-labs', value: 812.4, formattedValue: '$812.40', delta: 42.1, formattedDelta: '$42.10', sparklinePoints: [600, 650, 700, 690, 750, 780, 800, 812] },
  { key: 'acct_2', label: 'brightline', value: 401.2, formattedValue: '$401.20', delta: -18.4, formattedDelta: '$18.40', sparklinePoints: [420, 415, 410, 405, 402, 400, 401, 401] },
  { key: 'acct_3', label: 'summit-analytics', value: 220.5, formattedValue: '$220.50', delta: 5.2, formattedDelta: '$5.20', sparklinePoints: [200, 205, 210, 212, 215, 218, 219, 220] },
  { key: 'acct_4', label: 'wharf-systems', value: 118.0, formattedValue: '$118.00', delta: 0, formattedDelta: '$0.00', sparklinePoints: [118, 118, 118, 118, 118, 118, 118, 118] },
  { key: 'acct_5', label: 'clearwater', value: 96.3, formattedValue: '$96.30', delta: -2.1, formattedDelta: '$2.10', sparklinePoints: [98, 97, 96, 96, 96, 96, 96, 96] },
  { key: 'acct_6', label: 'north-star', value: 71.8, formattedValue: '$71.80', delta: 11.4, formattedDelta: '$11.40', sparklinePoints: [50, 55, 60, 62, 65, 68, 70, 72] },
  { key: 'acct_7', label: 'redline-ops', value: 44.2, formattedValue: '$44.20', delta: -1.0, formattedDelta: '$1.00', sparklinePoints: [45, 45, 44, 44, 44, 44, 44, 44] },
  { key: 'acct_8', label: 'fieldnote', value: 30.1, formattedValue: '$30.10', delta: 3.3, formattedDelta: '$3.30', sparklinePoints: [26, 27, 27, 28, 29, 29, 30, 30] },
  { key: 'acct_9', label: 'delta-forge', value: 18.6, formattedValue: '$18.60', delta: 0.4, formattedDelta: '$0.40', sparklinePoints: [18, 18, 18, 18, 18, 18, 18, 18] },
  { key: 'acct_10', label: 'ember-cloud', value: 9.4, formattedValue: '$9.40', delta: -0.2, formattedDelta: '$0.20', sparklinePoints: [9, 9, 9, 9, 9, 9, 9, 9] },
];

/** Sentinel-labelled user rows — the de-emphasized "Unidentified — Keycloak"/"Unidentified —
 *  GitHub" rows a caller resolves through `sentinel-labels.ts` before handing rows to this list.
 *  These fixtures already carry the RESOLVED labels, matching what the real screen would pass. */
export const rankedRowsSentinelUsers: RankedSeriesRow[] = [
  { key: 'user_maria', label: 'maria@brightline.dev', value: 22.4, formattedValue: '$22.40', sparklinePoints: [2, 3, 4, 5, 4, 3, 5, 6] },
  { key: 'missing:keycloak:preferred_username', label: 'Unidentified — Keycloak', value: 6.1, formattedValue: '$6.10', sparklinePoints: [1, 1, 1, 1, 1, 1, 0.6, 0.5] },
  { key: 'missing:github:preferred_username', label: 'Unidentified — GitHub', value: 2.0, formattedValue: '$2.00', sparklinePoints: [0.5, 0.5] },
  { key: '-', label: '-', value: 0.4, formattedValue: '$0.40' },
];

export const rankedRowsEmpty: RankedSeriesRow[] = [];
