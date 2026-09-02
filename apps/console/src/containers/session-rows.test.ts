import type { SessionRow, UserProfile } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  SESSION_USER_UNKNOWN_LABEL,
  formatDay,
  sessionKind,
  sessionStatus,
  subjectUserIdsOf,
  toSessionDetail,
  toSessionLedgerRow,
  toSessionUser,
} from './session-rows';

function row(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'ses_1',
    accountId: 'acc_1',
    projectId: 'prj_1',
    clientId: 'console-web',
    kind: 'browser',
    status: 'active',
    createdAt: '2026-08-12T09:14:00.000Z',
    updatedAt: '2026-08-12T09:14:00.000Z',
    lastUsedAt: '2026-09-01T18:02:00.000Z',
    expiresAt: '2026-09-19T09:14:00.000Z',
    userAgent: 'Mozilla/5.0',
    subject: 'acc_1',
    subjectUserId: 'acc_1',
    offline: false,
    expired: false,
    ...overrides,
  };
}

describe('sessionKind', () => {
  it('maps the constraint’s own pair', () => {
    expect(sessionKind('browser')).toBe('browser');
    expect(sessionKind('token')).toBe('token');
  });

  it('reads an unrecognised kind as token rather than dropping the row', () => {
    expect(sessionKind('device')).toBe('token');
  });
});

describe('sessionStatus', () => {
  it('takes the backend’s computed status, not the browser’s clock', () => {
    expect(sessionStatus(row({ status: 'active', expired: false }))).toBe('active');
    expect(sessionStatus(row({ status: 'expired', expired: true }))).toBe('expired');
  });

  it('keeps revoked winning over expiry, exactly as ADR-0020 Decision 6 states', () => {
    expect(sessionStatus(row({ status: 'revoked', expired: true }))).toBe('revoked');
  });

  it('falls back to the expired flag for a stored active row the server already called expired', () => {
    expect(sessionStatus(row({ status: 'active', expired: true }))).toBe('expired');
  });
});

describe('formatDay', () => {
  it('renders an ISO day, and nothing at all for an absent or unparseable timestamp', () => {
    expect(formatDay('2026-08-12T09:14:00.000Z')).toBe('2026-08-12');
    expect(formatDay(null)).toBeUndefined();
    expect(formatDay('not a date')).toBeUndefined();
  });
});

describe('subjectUserIdsOf', () => {
  it('de-duplicates and sorts, so the batch is one query and one stable cache key', () => {
    const ids = subjectUserIdsOf([
      row({ id: 'a', subjectUserId: 'usr_b' }),
      row({ id: 'b', subjectUserId: 'usr_a' }),
      row({ id: 'c', subjectUserId: 'usr_b' }),
    ]);

    expect(ids).toEqual(['usr_a', 'usr_b']);
  });

  it('contributes nothing for a row with no subject user — there is no id to ask about', () => {
    expect(subjectUserIdsOf([row({ subjectUserId: null })])).toEqual([]);
  });
});

describe('toSessionUser', () => {
  const profiles = new Map<string, UserProfile>([
    [
      'usr_1',
      {
        userId: 'usr_1',
        displayName: 'Maria Okonkwo',
        email: 'maria@brightline.dev',
        username: 'maria',
      },
    ],
    ['usr_2', { userId: 'usr_2', displayName: null, email: null, username: 'tobias.lang' }],
    ['usr_3', { userId: 'usr_3', displayName: null, email: null, username: null }],
  ]);

  it('shows a resolved identity as name over email', () => {
    expect(toSessionUser('usr_1', profiles)).toEqual({
      kind: 'user',
      name: 'Maria Okonkwo',
      email: 'maria@brightline.dev',
    });
  });

  it('never repeats the email as both lines', () => {
    const emailOnly = new Map<string, UserProfile>([
      ['usr_4', { userId: 'usr_4', displayName: null, email: 'x@y.dev', username: null }],
    ]);
    expect(toSessionUser('usr_4', emailOnly)).toEqual({ kind: 'user', name: 'x@y.dev' });
  });

  it('prefers displayName, then username, then email', () => {
    expect(toSessionUser('usr_2', profiles)).toEqual({ kind: 'user', name: 'tobias.lang' });
  });

  it('distinguishes “not asked yet” from “asked and got nothing”', () => {
    expect(toSessionUser('usr_1', undefined)).toEqual({ kind: 'resolving' });
    expect(toSessionUser('usr_9', profiles)).toEqual({ kind: 'unresolved', userId: 'usr_9' });
  });

  it('treats a profile that names nobody as unresolved, never as a synthesised name', () => {
    expect(toSessionUser('usr_3', profiles)).toEqual({ kind: 'unresolved', userId: 'usr_3' });
  });

  it('uses its own dated sentinel for a session that predates the subject column', () => {
    expect(toSessionUser(null, profiles)).toEqual({
      kind: 'unknown',
      label: SESSION_USER_UNKNOWN_LABEL,
    });
    // Deliberately NOT the refill queue's 2026-09 sentinel: two records, two releases.
    expect(SESSION_USER_UNKNOWN_LABEL).toBe('Unknown (pre-2026-08)');
  });
});

describe('toSessionLedgerRow', () => {
  it('names every absent fact rather than emitting an empty cell', () => {
    const ledgerRow = toSessionLedgerRow(
      row({ clientId: null, lastUsedAt: null }),
      { kind: 'resolving' },
      'acc_1'
    );

    expect(ledgerRow.client).toBeUndefined();
    expect(ledgerRow.lastUsed).toBeUndefined();
    expect(ledgerRow.created).toBe('2026-08-12');
    expect(ledgerRow.expires).toBe('2026-09-19');
  });

  it('carries the offline flag through verbatim — it is a backend fact, not a derivation', () => {
    expect(toSessionLedgerRow(row({ offline: true }), { kind: 'resolving' }, 'acc_1').offline).toBe(
      true
    );
  });
});

describe('toSessionDetail', () => {
  const page = [
    row({ id: 'ses_1', subject: 'acc_1' }),
    row({ id: 'ses_2', subject: 'acc_1' }),
    row({ id: 'ses_3', subject: 'acc_2' }),
  ];

  it('counts only the sessions for the same subject on THIS page', () => {
    const source = page[0]!;
    const detail = toSessionDetail(
      source,
      toSessionLedgerRow(source, { kind: 'user', name: 'Maria', email: 'maria@x.dev' }, 'acc_1'),
      page
    );

    expect(detail.subjectSessionsOnPage).toBe(2);
    expect(detail.accountId).toBe('acc_1');
    expect(detail.projectId).toBe('prj_1');
  });

  it('makes the typed confirmation ask for a string that is actually on screen', () => {
    const source = page[0]!;
    const withEmail = toSessionDetail(
      source,
      toSessionLedgerRow(source, { kind: 'user', name: 'Maria', email: 'maria@x.dev' }, 'acc_1'),
      page
    );
    expect(withEmail.confirmLabel).toBe('maria@x.dev');

    const withoutEmail = toSessionDetail(
      source,
      toSessionLedgerRow(source, { kind: 'user', name: 'tobias.lang' }, 'acc_1'),
      page
    );
    expect(withoutEmail.confirmLabel).toBe('tobias.lang');

    const unresolved = toSessionDetail(
      source,
      toSessionLedgerRow(source, { kind: 'unresolved', userId: 'usr_x' }, 'acc_1'),
      page
    );
    expect(unresolved.confirmLabel).toBe('usr_x');
  });

  it('reports no aimable subject — and therefore no bulk target — for a pre-migration row', () => {
    const source = row({ id: 'ses_9', subject: null });
    const detail = toSessionDetail(
      source,
      toSessionLedgerRow(source, { kind: 'unknown', label: SESSION_USER_UNKNOWN_LABEL }, 'acc_1'),
      page
    );

    expect(detail.subject).toBeUndefined();
    expect(detail.subjectSessionsOnPage).toBe(0);
  });
});
