'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SCOPE_RAIL_LABEL, ScopeRail } from '@lightbridge/ui-web/src/sections/scope-rail';

import { useConsoleScope } from '../client/use-console-scope';

/**
 * The LEFT rail's read-only scope echo, stacked under the nav spine on Overview and Api-Keys
 * (README §3/§5.2). Interactive scope selection lives in the right rail; this only makes the
 * active account/project unambiguous while reading the centre column.
 *
 * A third zone reading the same `?account=`/`?project=` params the right rail writes — no context,
 * no provider, no prop drilling across parallel routes (ADR 0011 Decision 2).
 */
export function ScopeEchoRail() {
  const scope = useConsoleScope();

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
