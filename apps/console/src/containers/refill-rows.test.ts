import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  isPending,
  microsToAmount,
  relativeAge,
  toDecisionRow,
  toRefillRequestRow,
} from './refill-rows';

const NOW = Date.parse('2026-03-01T12:00:00.000Z');

function request(overrides: Partial<AugmentationRequest> = {}): AugmentationRequest {
  return {
    id: 'req-1',
    budgetAccountId: 'budget-1',
    accountId: 'adorsys-gis',
    projectId: 'gateway-prod',
    period: '2026-03',
    requestedTier: 'tier-2',
    requestedAmountMicros: '250000000',
    status: 'pending',
    policyEffect: null,
    policyReasonCodes: [],
    matchedRuleIds: [],
    policyRevision: null,
    approvedAmountMicros: null,
    grantId: null,
    idempotencyKey: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: '2026-02-27T12:00:00.000Z',
    ...overrides,
  } as AugmentationRequest;
}

describe('microsToAmount', () => {
  it('converts integer micros to the major unit', () => {
    expect(microsToAmount('250000000')).toBe(250);
    expect(microsToAmount('1500000')).toBe(1.5);
  });

  it('treats absent or unparseable values as zero rather than NaN', () => {
    expect(microsToAmount(null)).toBe(0);
    expect(microsToAmount(undefined)).toBe(0);
    expect(microsToAmount('')).toBe(0);
    expect(microsToAmount('not-a-number')).toBe(0);
  });
});

describe('relativeAge', () => {
  it.each([
    ['2026-03-01T11:59:30.000Z', 'just now'],
    ['2026-03-01T11:30:00.000Z', '30 min ago'],
    ['2026-03-01T06:00:00.000Z', '6 h ago'],
    ['2026-02-28T12:00:00.000Z', '1 day ago'],
    ['2026-02-27T12:00:00.000Z', '2 days ago'],
  ])('renders %s as %s', (iso, expected) => {
    expect(relativeAge(iso, NOW)).toBe(expected);
  });

  it('clamps a future timestamp instead of printing a negative age', () => {
    expect(relativeAge('2026-03-02T12:00:00.000Z', NOW)).toBe('just now');
  });

  it('reports unknown for an unparseable timestamp', () => {
    expect(relativeAge('nonsense', NOW)).toBe('unknown');
  });
});

describe('toRefillRequestRow', () => {
  it('maps identity, age and the requested amount', () => {
    expect(toRefillRequestRow(request(), NOW)).toMatchObject({
      id: 'req-1',
      submittedAgo: '2 days ago',
      project: 'gateway-prod',
      account: 'adorsys-gis',
      requestedAmount: 250,
    });
  });

  it('renders an account-level request with a dash for the project', () => {
    expect(toRefillRequestRow(request({ projectId: null }), NOW).project).toBe('—');
  });
});

describe('toDecisionRow', () => {
  it('reports an approved decision with the approved amount', () => {
    const row = toDecisionRow(
      request({ status: 'approved', approvedAmountMicros: '100000000', reviewedBy: 'ada' })
    );
    expect(row).toMatchObject({
      decision: 'approved',
      amount: 100,
      decidedBy: 'ada',
      date: '2026-02-27',
    });
  });

  it('reports a rejection, falling back to the requested amount', () => {
    const row = toDecisionRow(request({ status: 'rejected', reviewedBy: 'ada' }));
    expect(row.decision).toBe('declined');
    expect(row.amount).toBe(250);
  });
});

describe('isPending', () => {
  it('matches only the pending status', () => {
    expect(isPending(request())).toBe(true);
    expect(isPending(request({ status: 'approved' }))).toBe(false);
  });
});
