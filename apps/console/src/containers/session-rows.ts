import type { SessionRow, UserProfile } from '@lightbridge/authz-rpc';
import type { ConsoleIdentity, SessionDetail, SessionLedgerRow } from '@lightbridge/ui-web';
import { identityDisplay } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `SessionRow` (lightbridge-authz#649/#657, `querySessions`) to
 * `/admin/sessions`' ledger rows and detail sheet.
 *
 * They live outside the screen adapter for the same reason `api-key-rows.ts`/`refill-rows.ts` do:
 * the mapping is where every date, sentinel and status decision actually happens, and it is
 * testable here without refine, a provider tree or a DOM.
 */

/** The pre-migration sentinel for a session with no recorded `subject` — dated, so it reads as a
 *  fact about the record rather than as a failure of the screen. The date is
 *  `migrations/20260824000003_sessions_add_subject.sql`, NOT the refill queue's own 2026-09 one
 *  (`lib/refill-requester.ts`); the two records lost their requester to two different releases. */
export const SESSION_USER_UNKNOWN_LABEL = 'Unknown (pre-2026-08)';

/**
 * `SessionRow.kind`'s real values — the `sessions_kind_client_id_check` constraint's own pair
 * (`migrations/20260823000002_sessions.sql`). A value outside it is a backend the console does not
 * know yet: it reads as `token`, which is the conservative half (a token session is the one the
 * offline/CLI copy is written for), and nothing is silently dropped from the table.
 */
export function sessionKind(kind: string): SessionLedgerRow['kind'] {
  return kind === 'browser' ? 'browser' : 'token';
}

/**
 * `SessionRow.status` is already the COMPUTED status (ADR-0020 Decision 6: `"expired"` is never
 * stored, and `revoked` always wins over expiry) — this maps the wire string onto the union and
 * does NOT re-derive it from `expiresAt`. Re-deriving would mean comparing the server's timestamp
 * against the browser's clock, which is exactly the disagreement `SessionRow.expired` exists to
 * remove. `expired` is consulted only as a fallback for an unrecognised status value.
 */
export function sessionStatus(row: SessionRow): SessionLedgerRow['status'] {
  if (row.status === 'revoked') return 'revoked';
  if (row.status === 'expired') return 'expired';
  if (row.status === 'active') return row.expired ? 'expired' : 'active';
  return row.expired ? 'expired' : 'active';
}

/** Dates render as plain ISO days, the same treatment `api-key-rows.ts` gives every ledger
 *  timestamp — a locale layer is a console-wide decision, not this screen's to take alone. */
export function formatDay(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Every distinct `subjectUserId` on a page, de-duplicated and SORTED — the argument to the ONE
 * `resolveUserProfiles` batch this screen fires per page (the story's own acceptance criterion:
 * one call per page of rows, never one per row).
 *
 * Sorted because the list doubles as the react-query cache key: `['b','a']` and `['a','b']` name
 * the same batch, and an unsorted key would refetch whenever the row order changed.
 *
 * A row with a NULL `subjectUserId` contributes nothing — either its `subject` predates
 * `migrations/20260824000003_sessions_add_subject.sql`, or that subject names no `accounts` row.
 * Both render the dated sentinel; neither is an id to ask about.
 */
export function subjectUserIdsOf(rows: readonly SessionRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.subjectUserId) ids.add(row.subjectUserId);
  }
  return [...ids].sort();
}

/**
 * `subjectUserId` + the resolved batch → the person a row renders.
 *
 * `profiles === undefined` means the batch has not answered yet (`resolving`); an EMPTY map after
 * a failure means it answered with nothing (`unresolved`). The caller distinguishes the two — this
 * function only maps them. A profile whose every display field is null is `unresolved` too: the
 * backend returns `userId` plus three nulls for a `users` row with no completed federated login,
 * which is a row that exists but names nobody, and the console must never synthesise a name for it.
 *
 * Name precedence is displayName → username → email: an email is a fallback identity, not a
 * preferred one, and showing it twice (as both lines) would say less than showing it once.
 */
export function toSessionUser(
  subjectUserId: string | null | undefined,
  profiles: ReadonlyMap<string, UserProfile> | undefined
): ConsoleIdentity {
  if (!subjectUserId) return { kind: 'unknown', label: SESSION_USER_UNKNOWN_LABEL };
  if (!profiles) return { kind: 'resolving' };

  const profile = profiles.get(subjectUserId);
  const name = profile?.displayName || profile?.username || profile?.email;
  if (!name) return { kind: 'unresolved', userId: subjectUserId };

  return {
    kind: 'user',
    name,
    email: profile?.email && profile.email !== name ? profile.email : undefined,
  };
}

/**
 * `accountLabel` is resolved by the caller against `resolveActorLabels` (lightbridge-authz#647),
 * falling back to the raw id only when the estate lookup genuinely had nothing — a raw id is never
 * a preferred label (converse-frontends#270), but it beats a blank cell.
 */
export function toSessionLedgerRow(
  row: SessionRow,
  user: ConsoleIdentity,
  accountLabel: string
): SessionLedgerRow {
  return {
    id: row.id,
    user,
    account: accountLabel,
    kind: sessionKind(row.kind),
    offline: row.offline,
    client: row.clientId ?? undefined,
    created: formatDay(row.createdAt) ?? '—',
    lastUsed: formatDay(row.lastUsedAt),
    expires: formatDay(row.expiresAt) ?? '—',
    status: sessionStatus(row),
  };
}

/**
 * The picked row, joined with the ids and the user agent the sheet shows.
 *
 * `subjectSessionsOnPage` counts the rows on the CURRENT page sharing this row's `subject` — the
 * only count the console can state truthfully before `revokeSubjectSessions` runs, since
 * `querySessions` pages and never totals. The confirmation says it in exactly those words.
 *
 * `confirmLabel` is what the typed confirmation makes the operator retype: the person's email
 * when the identity carries one, their display name otherwise, and the raw id when the lookup
 * resolved nothing — always a string that is actually ON SCREEN, never one the operator would have
 * to guess.
 */
export function toSessionDetail(
  row: SessionRow,
  ledgerRow: SessionLedgerRow,
  page: readonly SessionRow[]
): SessionDetail {
  const display = identityDisplay(ledgerRow.user);
  return {
    ...ledgerRow,
    subject: row.subject ?? undefined,
    accountId: row.accountId,
    projectId: row.projectId,
    userAgent: row.userAgent ?? undefined,
    subjectSessionsOnPage: row.subject
      ? page.filter((other) => other.subject === row.subject).length
      : 0,
    confirmLabel: display.detail ?? display.label,
  };
}
