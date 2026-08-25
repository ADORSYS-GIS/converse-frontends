'use client';

import { ScopeSelect } from '@lightbridge/ui-web/src/components/scope-select';

import { useConsoleScopeContext } from '../client/console-scope-context';
import { useManageViewState } from '../client/view-state';

/**
 * The `scopeSlot` `ReportExportPanel` renders inside the MONTHLY REPORT section — the panel owns
 * the report's parameters but never the account/project scope, so the scope arrives as a slot.
 *
 * Shared verbatim by the Manage centre (its compact-tier report sheet) and the Manage rail, so
 * the two copies of the panel always show the same scope control.
 */
export function ManageScopeSlot() {
  const scope = useConsoleScopeContext();
  const [, patchView] = useManageViewState();

  return (
    <ScopeSelect
      accounts={scope.accounts}
      projects={scope.projects}
      value={scope.value}
      onChange={(value) => {
        scope.setValue(value);
        patchView({ page: 1 });
      }}
    />
  );
}
