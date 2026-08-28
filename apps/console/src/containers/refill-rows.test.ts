import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  AUGMENTATION_STATUS,
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

  // converse-frontends#265: no consumption query is performed here — never fabricate a $0.00.
  it('leaves consumed and ceiling unset rather than fabricating $0.00', () => {
    const row = toRefillRequestRow(request(), NOW);
    expect(row.consumed).toBeNull();
    expect(row.ceiling).toBeNull();
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

  // The real backend value is `denied`, never `rejected` (authz.cstack:1146-1151) — this test
  // used to pin the wrong literal, which would have passed even with the bug this story fixes.
  it('reports a denial, falling back to the requested amount', () => {
    const row = toDecisionRow(request({ status: 'denied', reviewedBy: 'ada' }));
    expect(row.decision).toBe('declined');
    expect(row.amount).toBe(250);
  });

  it('keeps auto-approved distinct from a human approval', () => {
    const row = toDecisionRow(request({ status: 'auto_approved', reviewedBy: null }));
    expect(row.decision).toBe('auto_approved');
    expect(row.decidedBy).toBe('—');
  });

  // converse-frontends#264: a `pending_review` request must NEVER be mislabelled "declined" —
  // this was the actual production bug (every real pending request landed here as "declined").
  it('never labels a pending_review request as declined', () => {
    const row = toDecisionRow(request({ status: 'pending_review' }));
    expect(row.decision).not.toBe('declined');
    expect(row.decision).toBe('unknown');
    expect(row.rawStatus).toBe('pending_review');
  });

  it('falls back to "unknown" — never "declined" — for an unrecognised status', () => {
    const row = toDecisionRow(request({ status: 'archived' }));
    expect(row.decision).toBe('unknown');
    expect(row.rawStatus).toBe('archived');
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
