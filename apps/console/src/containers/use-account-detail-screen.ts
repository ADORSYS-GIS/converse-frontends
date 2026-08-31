'use client';

import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useAccountId } from '../client/use-account-id';
import { accountScopeLabel } from './account-label';
import { isHomeAccount } from './account-ownership';
import { microsToAmount } from './refill-rows';
import { BUDGET_HOME_ACCOUNT_ONLY_NOTE } from './use-budget-refill';
import { useOpenRenameAccountDialog } from './use-rename-account-dialog';

/**
 * `/settings/accounts/<id>` — the account detail screen's data adapter (IA v3 phase E, owner:
 * "/settings/accounts/<account-id> would be for account related settings like e.g members").
 * Three zones:
 *
 *  1. `accountSettings` — the SAME `AccountSettings` section/mutation `/settings/policies` used to
 *     render (rename + id/status/tier facts), now scoped to the PATH account
 *     (`useAccountId()`/`account`) rather than the scope's own fallback-resolved one — this route
 *     is guarded (`layout.tsx`) to only ever render for a known account, so `account` is `null`
 *     only while `scope` itself is still loading.
 *  2. `budget` — a genuinely honest "budget ceiling" fact (`getMyBudgetBalance`, Phase 2d's
 *     `isHomeAccount` gate, `BUDGET_HOME_ACCOUNT_ONLY_NOTE` on any other account — the SAME gap
 *     `/`'s own Budget card and the refill screen already render, never silently re-derived).
 *     Deliberately NOT a full consumption dashboard — that is `/accounts/<id>/overview`'s job;
 *     this is a settings-density fact, the same "rows, not a chart" idiom `AccountSettings`' own
 *     details already use.
 *  3. `membersReason` — `MEMBERS_DISABLED_REASON`: `Account` carries no membership concept at all
 *     today (`authz.cstack`'s own NOTE on the model: "per ADR-0006 there is no more membership/
 *     role concept... one account is one person" — only `ProjectMember`/`listProjectRoster` exist,
 *     both project-scoped). Filed as lightbridge-authz#594 (asking which of two outcomes applies:
 *     a real account-membership feature, or a recorded "intentionally out of scope" decision) —
 *     the block renders disabled-with-reason inline rather than fabricated or silently omitted,
 *     the same honesty doctrine the "Roles" nav row and `/settings/refill-options`' own omitted
 *     blocks already follow.
 */

const MEMBERS_DISABLED_REASON =
  'Accounts have no membership concept today — only projects do (lightbridge-authz#594).';

export type BudgetFacts =
  | { status: 'ready'; ceilingLabel: string }
  | { status: 'loading' }
  | { status: 'error'; caption: string; onRetry: () => void }
  | { status: 'unavailable'; caption: string };

export interface AccountDetailScreen {
  accountId: string;
  accountLabel: string | undefined;
  accountSettings: AccountSettingsProps;
  budget: BudgetFacts;
  membersReason: string;
  requestRefillHref: string;
}

export function useAccountDetailScreen(): AccountDetailScreen {
  const accountId = useAccountId();
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const budgetClient = useConsoleBudgetClient();
  const openRename = useOpenRenameAccountDialog();

  const account = scope.allAccounts.find((candidate) => candidate.id === accountId) ?? null;
  const accountIsHome = isHomeAccount(accountId, session);
  const period = useMemo(() => currentBudgetPeriod(), []);

  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    enabled: accountIsHome,
    staleTime: 30_000,
  });

  let budget: BudgetFacts;
  if (!accountIsHome) {
    budget = { status: 'unavailable', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
  } else if (balanceQuery.isPending) {
    budget = { status: 'loading' };
  } else if (balanceQuery.isError) {
    budget = {
      status: 'error',
      caption: 'Could not load the budget ceiling.',
      onRetry: () => void balanceQuery.refetch(),
    };
  } else {
    budget = {
      status: 'ready',
      ceilingLabel: formatUsd(microsToAmount(balanceQuery.data.effectiveBudgetMicros)),
    };
  }

  const accountSettings: AccountSettingsProps = {
    panel: {
      account: account === null ? null : { id: account.id, name: account.name ?? null },
      loading: scope.loading,
      error: scope.error ? 'Could not load this account.' : undefined,
      onRetry: () => scope.refetch(),
      // Unreachable in practice — `settings/accounts/[accountId]/layout.tsx` guards this route to
      // a known account, so `account` is only ever `null` while `scope` itself is still loading
      // (the `loading` branch above renders first). Kept as a real no-op, not omitted, so
      // `AccountSettingsPanel`'s required `onCreate` never needs a cast — the same "no account to
      // rename yet" idiom `app/(console)/page.tsx`'s own zero-accounts branch uses for its
      // inverse (`onRename: () => undefined`).
      onCreate: () => undefined,
      onRename: openRename,
    },
    details:
      account === null || scope.loading || scope.error
        ? null
        : { id: account.id, status: account.status, defaultQuotaTier: account.defaultQuota ?? null },
    onCopyId: (id: string) => {
      void navigator.clipboard?.writeText?.(id).catch(() => undefined);
    },
  };

  return {
    accountId,
    accountLabel: account ? accountScopeLabel(account) : undefined,
    accountSettings,
    budget,
    membersReason: MEMBERS_DISABLED_REASON,
    requestRefillHref: `/settings/accounts/${accountId}/request-refill`,
  };
}
