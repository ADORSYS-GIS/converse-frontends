import type { ReactNode } from 'react';

import type { LedgerSort } from '../../components/ledger-table';

export type ApiKeyStatus = 'active' | 'expiring' | 'revoked';

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  status: ApiKeyStatus;
  statusLabel: string;
  created: string;
  lastUsed: string;
  expires: string;
};

/** Props for the `TypedConfirmDialog` gating a Revoke action, retargeted to the row in question. */
export type ApiKeysRevokeTarget = {
  row: ApiKeyRow;
  /** Kept open with an inline error when a confirmed revoke fails server-side. */
  error?: string;
};

/**
 * Props for the `TypedConfirmDialog` gating a Delete action, retargeted to the row in question —
 * the same shape as `ApiKeysRevokeTarget`, kept as its own type because the two actions are never
 * interchangeable (ticket #321: Delete is destructive and admin-only, Revoke is not).
 */
export type ApiKeysDeleteTarget = {
  row: ApiKeyRow;
  /** Kept open with an inline error when a confirmed delete fails server-side. */
  error?: string;
};

/** The one-time secret strip shared by create and rotate (api-keys.svg). */
export type ApiKeysSecretReveal = {
  heading: string;
  description: string;
  secret: string;
};

export type ApiKeysPagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export interface ApiKeysLedgerProps {
  keys: ApiKeyRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  /**
   * Rendered instead of the table when `keys` is empty and not loading/erroring — an `EmptyState`
   * with a `+ New key` CTA, same eligibility gating as `PageHeader.action`'s own button
   * (`api-keys-centre.tsx`). There is no separate composed status summary any more (ticket
   * 2026-08-30: `statusSummary` duplicated `ApiKeysHygieneNotes`, which stays the ONE status line
   * for this ledger, mounted above it).
   */
  emptyState?: ReactNode;

  onRotate: (row: ApiKeyRow) => void;
  /** Opens the `TypedConfirmDialog` for this row. */
  onRequestRevoke: (row: ApiKeyRow) => void;
  revokeTarget?: ApiKeysRevokeTarget | null;
  onConfirmRevoke: (row: ApiKeyRow) => void;
  onCancelRevoke: () => void;

  /**
   * Client-side presentation gate only (ticket #321) — it hides the `Del` row action for a caller
   * who does not hold `apikey:delete`, so the LIFECYCLE rail's "admin only" copy stays true of what
   * is actually on screen. It is **not** a security boundary: `lightbridge-authz` enforces
   * `apikey:delete` server-side regardless of what this flag renders.
   *
   * It was `isAdmin` until converse-frontends#452, fed from a session flag that was really
   * `roles.includes('lightbridge-admin')` — a role production minted for everyone, so the gate
   * never actually hid anything. The console now names the permission the mutation needs and reads
   * the backend's own answer for it (`getMyAccess`).
   */
  canDelete: boolean;
  /** Opens the `TypedConfirmDialog` for this row, gating Delete exactly like Revoke. */
  onRequestDelete: (row: ApiKeyRow) => void;
  deleteTarget?: ApiKeysDeleteTarget | null;
  onConfirmDelete: (row: ApiKeyRow) => void;
  onCancelDelete: () => void;

  selectedRowKeys?: string[];
  onSelectRow?: (row: ApiKeyRow) => void;

  sort?: LedgerSort;
  onSortChange?: (sort: LedgerSort) => void;

  pagination?: ApiKeysPagination;

  /** Compact-tier trigger slot in the table toolbar — where the FILTERS trigger sits. */
  toolbarActions?: ReactNode;
  className?: string;
}
