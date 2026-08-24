import type { ReactNode } from 'react';

import type { ConsoleShellTier } from '../../components/console-shell';
import type { NavSpineProps } from '../../components/nav-spine';
import type { ScopeSelectProps } from '../../components/scope-select';
import type { SegmentedOption } from '../../components/segmented-control';

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

export type ApiKeysHygiene = {
  expiringCount: number;
  expiringInDays: number;
  neverUsedCount: number;
  revokedRetainedCount: number;
};

export type ApiKeysPagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export interface ApiKeysPageProps {
  tier: ConsoleShellTier;
  /** Fully composed `ConsoleHeader` — the page owns the shell composition, not the header identity. */
  header: ReactNode;
  nav: NavSpineProps;
  /** Left-rail SCOPE echo (api-keys.svg §5.2 — scope lives in the right rail; the left rail and
   * the page subline only echo it so the current project is never ambiguous). */
  scope: { accountLabel: string; projectLabel: string };

  keys: ApiKeyRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  /** Composed tone-coloured status summary, e.g. "23 active · 4 revoked · 1 expires in 6 days".
   * Rendered as the `InlineStatus` line above the ledger — this is also the empty-state primitive
   * when `keys` is empty. */
  statusSummary?: ReactNode;
  /** Shown instead of `statusSummary` when `keys` is empty and not loading/erroring. */
  emptyMessage?: ReactNode;

  /** Present after create or rotate; both return the same one-time secret contract. */
  secretReveal?: ApiKeysSecretReveal | null;
  onDismissSecret: () => void;

  onRotate: (row: ApiKeyRow) => void;
  onDelete: (row: ApiKeyRow) => void;
  /** Opens the TypedConfirmDialog for this row. */
  onRequestRevoke: (row: ApiKeyRow) => void;
  revokeTarget?: ApiKeysRevokeTarget | null;
  onConfirmRevoke: (row: ApiKeyRow) => void;
  onCancelRevoke: () => void;

  onCreateKey: () => void;

  selectedRowKeys?: string[];
  onSelectRow?: (row: ApiKeyRow) => void;

  pagination?: ApiKeysPagination;

  // right rail
  scopeSelect: ScopeSelectProps;
  statusFilterOptions: SegmentedOption<string>[];
  statusFilterValue: string;
  onStatusFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  hygiene: ApiKeysHygiene;

  className?: string;
}
