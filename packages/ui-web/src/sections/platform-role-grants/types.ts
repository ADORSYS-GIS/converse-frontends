import type { RefillRequester } from '../../lib/refill-requester';

/**
 * `/admin/roles` — the platform-role grant directory (converse-frontends#452, backed by
 * lightbridge-authz#656's `platform_role_grants` table and its four procedures).
 *
 * Presentational only, like every section: no data fetching, no local view state, every value
 * already resolved and formatted by the container (`use-admin-roles-screen.ts`).
 */

/**
 * Who granted a role.
 *
 * `cli` is NOT an unknown value — `platform_role_grants.granted_by` is NULL exactly when the row
 * was written by `lightbridge-authz rbac grant`, the CLI bootstrap that is the only way the FIRST
 * admin can exist (there is no admin to grant it). The schema says so verbatim: "render it as 'CLI
 * bootstrap', never as 'unknown'". A grant with a human granter carries their resolved identity.
 *
 * The three non-CLI branches ARE `RefillRequester`'s (minus its refill-specific `unknown`
 * sentinel), reused deliberately: "a person we may or may not have resolved yet" is the same fact
 * here as it is on the refills queue, resolved by the same `resolveUserProfiles` batch, and
 * `lib/requester-lines.tsx` already owns the name-over-email treatment both render. A second
 * parallel union would be the drift that helper exists to prevent.
 */
export type PlatformGrantAuthor = { kind: 'cli' } | Exclude<RefillRequester, { kind: 'unknown' }>;

/** The `cli` sentinel's label — a permanent fact about the row, not a missing value. */
export const GRANT_AUTHOR_CLI_LABEL = 'CLI bootstrap';

export interface PlatformRoleGrantRow {
  /** `platform_role_grants.id` — what `revokePlatformRole` is called with. */
  id: string;
  /** The person who holds the role. `userId` is a `users.id` (the human), never an account id. */
  user: RefillRequester;
  /** The raw role string, e.g. `lightbridge-admin`. Shown verbatim — it is what a grant names. */
  role: string;
  grantedBy: PlatformGrantAuthor;
  /** Preformatted for display; the container owns the clock and the format. */
  grantedAt: string;
  /** Preformatted, and set ONLY for a revoked grant — its presence IS the revoked state. */
  revokedAt?: string;
  /** Why the grant was made. Free text from the operator; absent when none was given. */
  reason?: string;
  /**
   * Whether this grant belongs to the signed-in caller. Drives the revoke dialog's explicit
   * self-revocation warning (converse-frontends#452 negative AC 3) — revoking your own
   * `lightbridge-admin` is legitimate, and it costs you this screen at the next mint.
   */
  isSelf: boolean;
}

export interface PlatformRoleGrantsPagination {
  shown: number;
  hasPrev: boolean;
  /** Reflects the real `nextCursor` the backend returned — never a fabricated `false`. */
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface PlatformRoleGrantsProps {
  grants: PlatformRoleGrantRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;

  /**
   * Whether the audit view is on — a DISPLAY flag here, not a control: it decides whether the
   * `Revoked` column is drawn at all (a column reading "—" on every row of the default view is
   * noise). The switch that writes it is `PlatformRoleGrantsControls`, a `PageControls` group on
   * the floor (ADR 0015 amendment A2 — filters are outside cards).
   */
  includeRevoked?: boolean;
  /**
   * Whether ANY filter is currently narrowing the list. Zero rows under a filter is an empty
   * RESULT (an `InlineStatus`, table kept); zero rows with no filter is an empty COLLECTION (an
   * `EmptyState`). Only the caller knows which, now that the filters live a row above this card.
   */
  filtered?: boolean;

  /** Opens the revoke confirmation for this row. Omitted from an already-revoked row. */
  onRequestRevoke: (row: PlatformRoleGrantRow) => void;

  /**
   * A degraded-but-not-broken note about identity resolution, rendered as an `InlineStatus` above
   * the table — the same split the refills queue uses: the grants load from
   * `listPlatformRoleGrants`, the names from a separate `resolveUserProfiles` batch, and the
   * second failing must never take the first down with it.
   */
  identityStatus?: string;

  /** Omitted entirely when there is nothing further to page to — never a dead pager row. */
  pagination?: PlatformRoleGrantsPagination;

  className?: string;
}

/** One searchable person in the grant dialog's picker — `searchUsers`' own `UserProfile`. */
export interface GrantUserOption {
  userId: string;
  /** The best display name the directory had; falls back to the username, then the raw id. */
  label: string;
  /** Shown muted under the label. Absent when the identity carries no email. */
  email?: string;
}

export interface GrantRoleDialogProps {
  open: boolean;

  /** The person search box's current text. Owned by the caller (ephemeral form draft). */
  query: string;
  onQueryChange: (query: string) => void;
  /** How many characters the backend requires before it will search at all. */
  minQueryLength: number;
  results: GrantUserOption[];
  searching: boolean;
  /** Set when the search itself failed — distinct from "no matches". */
  searchError?: string;

  /** The chosen person, or `null` while nobody is picked. */
  selectedUser: GrantUserOption | null;
  /** `null` when the picker was cleared — a real outcome, not an error. */
  onSelectUser: (user: GrantUserOption | null) => void;

  role: string;
  onRoleChange: (role: string) => void;
  roles: readonly string[];

  reason: string;
  onReasonChange: (reason: string) => void;

  submitting: boolean;
  /** A submit-time failure — kept inline, the dialog stays open (console-ui skill §states). */
  error?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface RevokeRoleDialogProps {
  /** The grant being revoked, or `null` for a closed dialog. */
  grant: PlatformRoleGrantRow | null;
  submitting: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
