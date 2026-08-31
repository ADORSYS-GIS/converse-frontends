import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { SettingsRow } from '../../components/settings-row';
import { SkeletonRow } from '../../components/skeleton-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import type { AccountDirectoryProps, AccountDirectoryRow } from './types';

export const ACCOUNT_DIRECTORY_REGION_LABEL = 'Accounts';

export const NO_ACCOUNTS_MESSAGE =
  'You do not have any accounts yet. Create one to start using projects, API keys and budgets.';

/** The row's own one-line status/tier summary — the same `rowSummary` shape `ProjectSettings`
 *  uses for its own rows, applied to an account instead of a project. */
function rowSummary(account: AccountDirectoryRow): string {
  return `${account.status} · ${account.defaultQuotaTier ?? NO_QUOTA_TIER_LABEL}`;
}

// Contract: IA v3 phase E (`/settings/accounts`) — the identity's account family, the SAME data
// the workspace switcher already lists, restyled as the classical `settings-list`/`SettingsRow`
// idiom `ProjectSettings`/`AccountSettings` already establish (phase 9, owner: "The settings
// pages do NOT look like a settings page. Why not do the classical list-like setting page?").
//
// Unlike `ProjectSettings`, a row's click is real NAVIGATION (`onSelectAccount`, the caller
// pushes to `/settings/accounts/<id>`) rather than opening an in-page `BottomSheet` — an account
// gets a whole settings area of its own now (Overview/Projects/Request refill), not a sheet's
// worth of fields. No search box either: an identity's account family is small by construction
// (ADR-0026 — "one identity may own SEVERAL accounts", not many), so the search/pagination
// `ProjectSettings` needs past a handful of projects has no equivalent problem to solve here yet.
export function AccountDirectory({
  accounts,
  loading = false,
  loadingRowCount = 3,
  error,
  onRetry,
  onCreate,
  createDisabled = false,
  createReason,
  onSelectAccount,
  className,
}: AccountDirectoryProps) {
  const isEmpty = !loading && !error && accounts.length === 0;

  let body: React.ReactNode;

  if (error) {
    body = <ErrorLine message={error} onRetry={onRetry} />;
  } else if (loading) {
    body = (
      <div className="settings-list">
        {Array.from({ length: loadingRowCount }, (_, index) => (
          <SkeletonRow key={index} columnCount={2} />
        ))}
      </div>
    );
  } else if (isEmpty) {
    body = (
      <EmptyState
        headline="No accounts yet"
        explainer={createReason ? `${NO_ACCOUNTS_MESSAGE} ${createReason}` : NO_ACCOUNTS_MESSAGE}
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onCreate}
            disabled={createDisabled}>
            Create account
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="settings-list">
        {accounts.map((account) => (
          <SettingsRow
            key={account.id}
            label={account.label}
            description={rowSummary(account)}
            onClick={() => onSelectAccount(account.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label={ACCOUNT_DIRECTORY_REGION_LABEL}
      className={cn('flex flex-col gap-4', className)}>
      {body}
    </section>
  );
}
