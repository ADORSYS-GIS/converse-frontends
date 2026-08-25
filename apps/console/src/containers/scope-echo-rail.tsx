'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SCOPE_RAIL_LABEL, ScopeRail } from '@lightbridge/ui-web/src/sections/scope-rail';

import { useConsoleScopeContext } from '../client/console-scope-context';

/**
 * The LEFT rail's read-only scope echo, stacked under the nav spine on Overview and Api-Keys
 * (README §3/§5.2). Interactive scope selection lives in the right rail; this only makes the
 * active account/project unambiguous while reading the centre column.
 */
export function ScopeEchoRail() {
  const scope = useConsoleScopeContext();

  return (
    <RailPanel label={SCOPE_RAIL_LABEL}>
      <ScopeRail
        accountLabel={scope.value.accountId || '—'}
        projectLabel={
          scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
          'All projects'
        }
      />
    </RailPanel>
  );
}
