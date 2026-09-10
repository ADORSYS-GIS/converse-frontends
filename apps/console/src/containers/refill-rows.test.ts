import type { AugmentationRequest, UserProfile } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  AUGMENTATION_STATUS,
  isPending,
  microsToAmount,
  refillHref,
  refillStatusLabel,
  relativeAge,
  requesterIdsOf,
  toRefillHistoryRow,
  toRefillRequestRow,
  toRequester,
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
    requestedByUserId: 'usr_maria',
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
    expect(
      toRefillRequestRow(request(), NOW, 'gateway-prod', 'adorsys-gis', {
        kind: 'user',
        name: 'Maria Okonkwo',
        email: 'maria@brightline.dev',
      })
    ).toMatchObject({
      id: 'req-1',
      submittedAgo: '2 days ago',
      project: 'gateway-prod',
      account: 'adorsys-gis',
      requester: { kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' },
      requestedAmount: 250,
    });
  });

  // converse-frontends#270: this module has no data source of its own to resolve an id against —
  // it never falls back to `request.projectId`/`request.accountId` itself, so a raw uuid can only
  // reach the row if the CALLER passes one in.
  it('never resolves labels itself — it trusts exactly what the caller passes', () => {
    const row = toRefillRequestRow(request(), NOW, '—', 'acct_9f3a', { kind: 'unknown' });
    expect(row.project).toBe('—');
    expect(row.account).toBe('acct_9f3a');
  });

  // The requester is passed IN, exactly like the project/account labels: this module resolves no
  // id against any data source of its own (converse-frontends#270's rule, applied to #444's new
  // column too). The batch lives in `use-refills-queue-screen.ts`; the mapping is `toRequester`.
  it('takes the requester from the caller rather than reading the request field itself', () => {
    const row = toRefillRequestRow(
      request({ requestedByUserId: 'usr_ignored' }),
      NOW,
      'gateway-prod',
      'adorsys-gis',
      { kind: 'unresolved', userId: 'usr_passed_in' }
    );
    expect(row.requester).toEqual({ kind: 'unresolved', userId: 'usr_passed_in' });
  });

  it('carries no consumed/ceiling/requesterEmail fields any more', () => {
    const row = toRefillRequestRow(request(), NOW, 'gateway-prod', 'adorsys-gis', {
      kind: 'unknown',
    });
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

describe('refillStatusLabel', () => {
  it('sentence-cases every known backend status literal', () => {
    expect(refillStatusLabel(AUGMENTATION_STATUS.PENDING_REVIEW)).toBe('Pending review');
    expect(refillStatusLabel(AUGMENTATION_STATUS.AUTO_APPROVED)).toBe('Auto-approved');
    expect(refillStatusLabel(AUGMENTATION_STATUS.APPROVED)).toBe('Approved');
    expect(refillStatusLabel(AUGMENTATION_STATUS.DENIED)).toBe('Declined');
  });

  it('falls back to the raw string for an unrecognised status, rather than disappearing', () => {
    expect(refillStatusLabel('some_future_status')).toBe('some_future_status');
  });
});

describe('toRefillHistoryRow', () => {
  it('maps identity, age, amount and a sentence-case status — no project/account label', () => {
    const row = toRefillHistoryRow(request(), NOW);
    expect(row).toEqual({
      id: 'req-1',
      submittedAgo: '2 days ago',
      amount: 250,
      statusLabel: 'Pending review',
    });
  });
});

describe('refillHref', () => {
  it('builds the bare account-scoped path when no project is scoped', () => {
    expect(refillHref('acct_1', undefined)).toBe('/settings/accounts/acct_1/request-refill');
    expect(refillHref('acct_1', null)).toBe('/settings/accounts/acct_1/request-refill');
    expect(refillHref('acct_1', '')).toBe('/settings/accounts/acct_1/request-refill');
  });

  it('carries ?project= when a project is scoped', () => {
    expect(refillHref('acct_1', 'proj_7')).toBe(
      '/settings/accounts/acct_1/request-refill?project=proj_7'
    );
  });
});

// converse-frontends#444 — the batch key and the sentinel mapping behind the Requester column.
describe('requesterIdsOf', () => {
  it('de-duplicates and sorts, so N rows produce ONE stable batch key', () => {
    const ids = requesterIdsOf([
      request({ id: 'a', requestedByUserId: 'usr_b' }),
      request({ id: 'b', requestedByUserId: 'usr_a' }),
      request({ id: 'c', requestedByUserId: 'usr_b' }),
    ]);
    expect(ids).toEqual(['usr_a', 'usr_b']);
  });

  it('produces the same key whatever order the same page arrives in', () => {
    const forward = requesterIdsOf([
      request({ id: 'a', requestedByUserId: 'usr_a' }),
      request({ id: 'b', requestedByUserId: 'usr_b' }),
    ]);
    const reversed = requesterIdsOf([
      request({ id: 'b', requestedByUserId: 'usr_b' }),
      request({ id: 'a', requestedByUserId: 'usr_a' }),
    ]);
    expect(forward).toEqual(reversed);
  });

  it('drops pre-migration NULL ids — there is nothing to ask about', () => {
    expect(
      requesterIdsOf([
        request({ id: 'a', requestedByUserId: null }),
        request({ id: 'b', requestedByUserId: 'usr_a' }),
      ])
    ).toEqual(['usr_a']);
  });

  it('asks for nothing at all when the whole page predates the migration', () => {
    expect(requesterIdsOf([request({ requestedByUserId: null })])).toEqual([]);
  });
});

describe('toRequester', () => {
  function profiles(...entries: UserProfile[]): ReadonlyMap<string, UserProfile> {
    return new Map(entries.map((entry) => [entry.userId, entry]));
  }

  it('resolves a real identity to its name with the email underneath', () => {
    expect(
      toRequester(
        'usr_maria',
        profiles({
          userId: 'usr_maria',
          displayName: 'Maria Okonkwo',
          email: 'maria@brightline.dev',
          username: 'maria',
        })
      )
    ).toEqual({ kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' });
  });

  it('falls back displayName -> username -> email, never inventing one', () => {
    expect(
      toRequester('u', profiles({ userId: 'u', displayName: null, username: 'tobias.lang' }))
    ).toEqual({ kind: 'user', name: 'tobias.lang', email: undefined });
    expect(
      toRequester('u', profiles({ userId: 'u', displayName: null, email: 'tobias@x.dev' }))
    ).toEqual({ kind: 'user', name: 'tobias@x.dev', email: undefined });
  });

  it('renders the pre-2026-09 sentinel for a NULL requestedByUserId', () => {
    expect(toRequester(null, profiles())).toEqual({ kind: 'unknown' });
    expect(toRequester(undefined, profiles())).toEqual({ kind: 'unknown' });
  });

  it('renders the unresolved sentinel — carrying the raw id — for an id the batch had nothing for', () => {
    expect(toRequester('usr_ghost', profiles())).toEqual({
      kind: 'unresolved',
      userId: 'usr_ghost',
    });
  });

  it('treats a profile with no display field at all as unresolved rather than synthesising one', () => {
    expect(
      toRequester(
        'usr_bare',
        profiles({ userId: 'usr_bare', displayName: null, email: null, username: null })
      )
    ).toEqual({ kind: 'unresolved', userId: 'usr_bare' });
  });

  it('distinguishes "batch still in flight" from "batch answered with nothing"', () => {
    expect(toRequester('usr_maria', undefined)).toEqual({ kind: 'resolving' });
    expect(toRequester('usr_maria', profiles())).toEqual({
      kind: 'unresolved',
      userId: 'usr_maria',
    });
  });

  it('never prints the same email twice as both lines', () => {
    expect(
      toRequester('u', profiles({ userId: 'u', displayName: null, email: 'solo@x.dev' }))
    ).toEqual({ kind: 'user', name: 'solo@x.dev', email: undefined });
  });
});
