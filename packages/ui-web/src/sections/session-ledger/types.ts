import type { ReactNode } from 'react';

import type { ConsoleIdentity } from '../../lib/identity-lines';

/**
 * `sessions.kind` (`migrations/20260823000002_sessions.sql`, guarded by the
 * `sessions_kind_client_id_check` constraint) — the two values the column ever holds.
 */
export type SessionKind = 'browser' | 'token';

/**
 * The COMPUTED status `SessionRow.status` reports (lightbridge-authz ADR-0020 Decision 6):
 * `'expired'` is never stored, it is `'active'` past its `expiresAt`. `'revoked'` always wins over
 * expiry — revocation is the operator-visible act, expiry is just time passing.
 */
export type SessionStatus = 'active' | 'revoked' | 'expired';

/** One row of `/admin/sessions`. Every timestamp arrives PRE-FORMATTED: the ledger renders, the
 *  container reads the clock (`containers/session-rows.ts`), the same split `ApiKeyRow` uses. */
export interface SessionLedgerRow {
  id: string;
  /** The person behind the session — `SessionRow.subjectUserId` resolved through one batched
   *  `resolveUserProfiles` call per page, or a labelled sentinel for every branch that is not a
   *  resolved identity. */
  user: ConsoleIdentity;
  /** The session's account, as a display label — never a raw id (converse-frontends#270). */
  account: string;
  kind: SessionKind;
  /**
   * The session's refresh chain carries the `offline_access` scope — a CLI or device login that
   * outlives a browser session (OIDC Core §11), the owner-confirmed definition of "offline"
   * (plan-brief Q7). Rendered as a small trailing marker on the Kind cell, and explained in the
   * ledger's own caption rather than left to the reader to guess.
   */
  offline: boolean;
  /** The OAuth client the session was minted for (`clientId`, the `azp`). Absent for a browser
   *  session that records none. */
  client?: string;
  created: string;
  /** Absent when the session has never been used since it was minted. */
  lastUsed?: string;
  expires: string;
  status: SessionStatus;
}

export interface SessionLedgerPagination {
  shown: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export interface SessionLedgerProps {
  sessions: SessionLedgerRow[];
  loading?: boolean;
  loadingRowCount?: number;
  /** A genuine fetch failure — replaces the table with an `ErrorLine` (`role="alert"` + Retry). */
  error?: string;
  onRetry?: () => void;
  /**
   * Degraded, non-blocking status shown ABOVE the table: the `resolveUserProfiles` batch failed,
   * or the user search returned nothing. `role="status"`, never `ErrorLine` — the rows below are
   * real and revocable, only their names are missing (console-ui skill "States").
   */
  status?: ReactNode;
  /**
   * What an empty result means HERE, as a sentence. Rendered as an inline status line, never a
   * centred placard: this table always has filters above it, so "nothing matched" is a fact about
   * the filters and not a first-run state (owner rule: "empty states are inline status lines").
   */
  emptyMessage: string;
  /** Clears the filters that produced an empty result — rendered beside `emptyMessage`. */
  onResetFilters?: () => void;
  selectedSessionId?: string | null;
  onSelectSession?: (row: SessionLedgerRow) => void;
  pagination?: SessionLedgerPagination;
  className?: string;
}

/** Everything the detail sheet shows that the row does not, plus the ids the two revoke actions
 *  are aimed with. */
export interface SessionDetail extends SessionLedgerRow {
  /** `sessions.subject` — the session owner's JWT `sub`, which IS `accounts.id` (ADR-0006). It is
   *  what `revokeSubjectSessions` takes as its `accountId`. Absent on a row minted before
   *  `migrations/20260824000003_sessions_add_subject.sql`, which is exactly why the "close all"
   *  action is unavailable there: there is nothing to aim it at. */
  subject?: string;
  accountId: string;
  projectId: string;
  userAgent?: string;
  /** How many sessions for this same subject are listed on the CURRENT page — the only count the
   *  console can state truthfully before the call is made (`querySessions` pages, it does not
   *  total). The confirmation says so in those words. */
  subjectSessionsOnPage: number;
  /** The exact string the "close all" confirmation makes the operator type: the person's email,
   *  or their display name when the identity carries no email. */
  confirmLabel: string;
}

export interface SessionDetailPanelProps {
  session: SessionDetail;
  /** Opens the plain single-session confirmation. Never rendered for a session that is not
   *  `active` — there is nothing left to close. */
  onRequestClose: () => void;
  closeConfirmOpen: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  /** Opens the typed all-sessions-for-this-user confirmation. */
  onRequestCloseAll: () => void;
  closeAllConfirmOpen: boolean;
  onConfirmCloseAll: () => void;
  onCancelCloseAll: () => void;
  /** A revoke is in flight — both actions go disabled rather than becoming double-submittable. */
  busy?: boolean;
  /** A revoke failed. Rendered as an `ErrorLine` in the panel; the optimistic row status has
   *  already been rolled back by the container by the time this is set. */
  error?: string;
  /** A revoke succeeded — an `InlineStatus` stating what was closed. */
  success?: string;
  className?: string;
}
