'use client';

import { ScopeSelect } from '@lightbridge/ui-web/src/components/scope-select';

import { useConsoleScope } from '../client/use-console-scope';

/**
 * The `scopeSlot` `ReportExportPanel` renders inside the Export dialog — the panel owns the
 * report's own parameters but never the account/project scope, so the scope arrives as a slot.
 *
 * Phase 4's Overview `Export` action reuses the same idiom `ManageScopeSlot` established (#309):
 * both read and write the same `?account=`/`?project=` params (ADR 0011 Decision 2 — the URL is
 * the cross-zone state bus), so a change here is visible everywhere else scope is read without
 * either side knowing the other exists. Unlike `ManageScopeSlot`, Overview has no page number to
 * reset on re-scope — there is nothing paginated on this screen.
 */
export function OverviewScopeSlot() {
  const scope = useConsoleScope();

  return (
    <ScopeSelect
      accounts={scope.accounts}
      projects={scope.projects}
      value={scope.value}
      onChange={(value) => scope.setValue(value)}
    />
  );
}
