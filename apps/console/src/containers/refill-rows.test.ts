import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import { AUGMENTATION_STATUS, isPending, microsToAmount, relativeAge, toRefillRequestRow } from './refill-rows';

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
    status: AUGMENTATION_STATUS.PENDING_REVIEW,
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

describe('AUGMENTATION_STATUS', () => {
  // Regression pin for converse-frontends#264: the backend's real pending-state value is
  // `pending_review` (authz.cstack:951-955,968-988), never the `'pending'` literal this module
  // used to compare against. A future rename must fail this test, not silently empty the queue.
  it('pins the real backend status literals', () => {
    expect(AUGMENTATION_STATUS.PENDING_REVIEW).toBe('pending_review');
    expect(AUGMENTATION_STATUS.AUTO_APPROVED).toBe('auto_approved');
    expect(AUGMENTATION_STATUS.APPROVED).toBe('approved');
    expect(AUGMENTATION_STATUS.DENIED).toBe('denied');
  });
});

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
  it('maps identity, age and the requested amount, using the caller-resolved labels verbatim', () => {
    expect(toRefillRequestRow(request(), NOW, 'gateway-prod', 'adorsys-gis')).toMatchObject({
      id: 'req-1',
      submittedAgo: '2 days ago',
      project: 'gateway-prod',
      account: 'adorsys-gis',
      requestedAmount: 250,
    });
  });

  // converse-frontends#270: this module has no data source of its own to resolve an id against —
  // it never falls back to `request.projectId`/`request.accountId` itself, so a raw uuid can only
  // reach the row if the CALLER passes one in.
  it('never resolves labels itself — it trusts exactly what the caller passes', () => {
    const row = toRefillRequestRow(request(), NOW, '—', 'acct_9f3a');
    expect(row.project).toBe('—');
    expect(row.account).toBe('acct_9f3a');
  });

  it('carries no consumed/ceiling/requesterEmail fields any more', () => {
    const row = toRefillRequestRow(request(), NOW, 'gateway-prod', 'adorsys-gis');
    expect(row).not.toHaveProperty('consumed');
    expect(row).not.toHaveProperty('ceiling');
    expect(row).not.toHaveProperty('requesterEmail');
  });
});

describe('isPending', () => {
  it('matches only pending_review, the real backend literal', () => {
    expect(isPending(request())).toBe(true);
    expect(isPending(request({ status: 'approved' }))).toBe(false);
    expect(isPending(request({ status: 'auto_approved' }))).toBe(false);
    expect(isPending(request({ status: 'denied' }))).toBe(false);
  });

  it('does not match the old, wrong literal', () => {
    expect(isPending(request({ status: 'pending' }))).toBe(false);
  });
});
