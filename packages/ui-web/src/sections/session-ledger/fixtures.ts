import type { SessionDetail, SessionLedgerRow } from './types';

/**
 * A page of sessions as `/admin/sessions` really receives one: a mix of browser and token kinds,
 * one offline (CLI) login, one row whose identity resolved without an email, one pre-migration
 * row with no subject at all, and one id `resolveUserProfiles` had nothing for. Storybook and the
 * section's own tests both read from here so a state cannot be demonstrated in one and missing
 * from the other.
 */
export const sessionRowsFixture: SessionLedgerRow[] = [
  {
    id: 'ses_2f1c9d0a4b7e',
    user: { kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' },
    account: 'Brightline',
    kind: 'browser',
    offline: false,
    client: 'console-web',
    created: '12 Aug 2026',
    lastUsed: '2 h ago',
    expires: '19 Sep 2026',
    status: 'active',
  },
  {
    id: 'ses_7a3e5b1f8c02',
    user: { kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' },
    account: 'Brightline',
    kind: 'token',
    offline: true,
    client: 'lightbridge-cli',
    created: '03 Jul 2026',
    lastUsed: '11 min ago',
    expires: '03 Jan 2027',
    status: 'active',
  },
  {
    id: 'ses_c48d2100ae91',
    user: { kind: 'user', name: 'tobias.lang' },
    account: 'Meridian Labs',
    kind: 'browser',
    offline: false,
    client: 'console-web',
    created: '28 Aug 2026',
    lastUsed: '1 day ago',
    expires: '04 Sep 2026',
    status: 'active',
  },
  {
    id: 'ses_9b0f7e6d3a15',
    user: { kind: 'unresolved', userId: 'usr_k3m9x1qp0z7b' },
    account: 'Northwind',
    kind: 'token',
    offline: true,
    client: 'agent-runner',
    created: '19 Jun 2026',
    lastUsed: '6 days ago',
    expires: '19 Dec 2026',
    status: 'revoked',
  },
  {
    id: 'ses_51ad8c2b6f34',
    user: { kind: 'unknown', label: 'Unknown (pre-2026-08)' },
    account: 'Northwind',
    kind: 'browser',
    offline: false,
    created: '02 Feb 2026',
    expires: '09 Feb 2026',
    status: 'expired',
  },
];

/** Only the live rows — what the default `status: active` filter shows. */
export const activeSessionRowsFixture: SessionLedgerRow[] = sessionRowsFixture.filter(
  (row) => row.status === 'active'
);

export const sessionDetailFixture: SessionDetail = {
  ...sessionRowsFixture[1]!,
  subject: 'acc_5f2b81c07d3e',
  accountId: 'acc_5f2b81c07d3e',
  projectId: 'prj_1a9c33e6b842',
  userAgent: 'lightbridge-cli/1.9.2 (darwin; arm64)',
  subjectSessionsOnPage: 2,
  confirmLabel: 'maria@brightline.dev',
};

/** A row the "close session" action must NOT offer — there is nothing left to close. */
export const revokedSessionDetailFixture: SessionDetail = {
  ...sessionRowsFixture[3]!,
  subject: 'acc_ba71e0c94f28',
  accountId: 'acc_ba71e0c94f28',
  projectId: 'prj_44c0f7d1ba59',
  userAgent: 'python-requests/2.32.3',
  subjectSessionsOnPage: 1,
  confirmLabel: 'usr_k3m9x1qp0z7b',
};
