'use client';

import { ScopeSelect } from '@lightbridge/ui-web/src/components/scope-select';

import { useManageParams } from '../client/url-state';
import { useConsoleScope } from '../client/use-console-scope';

/**
 * The `scopeSlot` `ReportExportPanel` renders inside the MONTHLY REPORT section — the panel owns
 * the report's parameters but never the account/project scope, so the scope arrives as a slot.
 *
 * Shared verbatim by the Manage centre (its compact-tier report sheet) and the Manage rail. They
 * are two mounts of the same control in two React subtrees, and they agree because both read the
 * same `?account=`/`?project=` params — not because a provider is holding a value for them
 * (ADR 0011 Decision 2).
 *
 * `accounts` is narrowed to the one currently-scoped account (Phase 2d, account-scoping audit,
 * converse-frontends#368/#392): offering every other account here was a dead affordance, since
 * `scope.setValue` silently ignores an account change.
 */
export function ManageScopeSlot() {
  const scope = useConsoleScope();
  const [, setView] = useManageParams();
  const scopedAccount = scope.accounts.find((account) => account.id === scope.value.accountId);

  return (
    <ScopeSelect
      accounts={scopedAccount ? [scopedAccount] : []}
      projects={scope.projects}
      value={scope.value}
      onChange={(value) => {
        scope.setValue(value);
        // Re-scoping invalidates the current page number. Queued in the same tick as the scope
        // write, so nuqs coalesces both into one history entry.
        void setView({ page: 1 }, { history: 'push' });
      }}
    />
  );
}
