import type { ReactNode } from 'react';

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
   * Composed status summary, e.g. "23 active · 4 revoked · 1 expires in 6 days". Rendered as the
   * `InlineStatus` line in the table toolbar.
   */
  statusSummary?: ReactNode;
  /** Shown instead of `statusSummary` when `keys` is empty and not loading/erroring. */
  emptyMessage?: ReactNode;

  /** Present after create or rotate; both return the same one-time secret contract. */
  secretReveal?: ApiKeysSecretReveal | null;
  onDismissSecret: () => void;

  onRotate: (row: ApiKeyRow) => void;
  onDelete: (row: ApiKeyRow) => void;
  /** Opens the `TypedConfirmDialog` for this row. */
  onRequestRevoke: (row: ApiKeyRow) => void;
  revokeTarget?: ApiKeysRevokeTarget | null;
  onConfirmRevoke: (row: ApiKeyRow) => void;
  onCancelRevoke: () => void;

  selectedRowKeys?: string[];
  onSelectRow?: (row: ApiKeyRow) => void;

  pagination?: ApiKeysPagination;

  /** Compact-tier trigger slot in the table toolbar — where the FILTERS trigger sits. */
  toolbarActions?: ReactNode;
  className?: string;
}
