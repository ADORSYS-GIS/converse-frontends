import type { GrantUserOption, PlatformRoleGrantRow } from './types';

/**
 * Fixture grants for the stories and the component tests.
 *
 * Deliberately covers every branch the section renders differently rather than five happy rows:
 * a CLI-bootstrap grant (NULL `granted_by`, the only way the first admin exists), a grant made by
 * a resolved human, one whose holder's identity did not resolve, one with no reason recorded, the
 * caller's OWN grant (the self-revoke warning's trigger), and a revoked one (no row action, a
 * revocation timestamp).
 */
export const platformRoleGrantsFixture: PlatformRoleGrantRow[] = [
  {
    id: 'grant_boot',
    user: { kind: 'user', name: 'Stephane Segning', email: 'stephane@adorsys.com' },
    role: 'lightbridge-admin',
    grantedBy: { kind: 'cli' },
    grantedAt: '2026-09-01 09:12',
    reason: 'First admin — bootstrap before B1 flipped the prod claim mapper.',
    isSelf: true,
  },
  {
    id: 'grant_ada',
    user: { kind: 'user', name: 'Ada Nkemdirim', email: 'ada@example.com' },
    role: 'lightbridge-editor',
    grantedBy: { kind: 'user', name: 'Stephane Segning', email: 'stephane@adorsys.com' },
    grantedAt: '2026-09-01 11:40',
    reason: 'On-call operator for the September budget review.',
    isSelf: false,
  },
  {
    id: 'grant_kofi',
    user: { kind: 'user', name: 'Kofi Mensah' },
    role: 'lightbridge-admin',
    grantedBy: { kind: 'user', name: 'Stephane Segning', email: 'stephane@adorsys.com' },
    grantedAt: '2026-09-02 08:05',
    isSelf: false,
  },
  {
    id: 'grant_unresolved',
    user: { kind: 'unresolved', userId: 'usr_01k4h2m9x7q3n5t8v0w2y4z6b8' },
    role: 'lightbridge-viewer',
    grantedBy: { kind: 'cli' },
    grantedAt: '2026-08-28 16:22',
    reason: 'Read-only access for the audit review.',
    isSelf: false,
  },
];

/** The same page with a revoked row appended — what `Include revoked` widens the view to. */
export const platformRoleGrantsWithRevokedFixture: PlatformRoleGrantRow[] = [
  ...platformRoleGrantsFixture,
  {
    id: 'grant_revoked',
    user: { kind: 'user', name: 'Marta Lindqvist', email: 'marta@example.com' },
    role: 'lightbridge-admin',
    grantedBy: { kind: 'user', name: 'Stephane Segning', email: 'stephane@adorsys.com' },
    grantedAt: '2026-08-14 10:01',
    revokedAt: '2026-08-30 17:44',
    reason: 'Temporary escalation for the migration window.',
    isSelf: false,
  },
];

/** `searchUsers` results for the grant dialog's person picker. */
export const grantUserSearchFixture: GrantUserOption[] = [
  { userId: 'usr_ada', label: 'Ada Nkemdirim', email: 'ada@example.com' },
  { userId: 'usr_adaeze', label: 'Adaeze Obi', email: 'adaeze@example.com' },
  // No email at all — `federated_identities` carries every profile field independently nullable,
  // so an identity with a name and nothing else is a real, common row, not an edge case.
  { userId: 'usr_adam', label: 'adam.k' },
];
