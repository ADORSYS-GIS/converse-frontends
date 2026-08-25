'use client';

import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';

import { RailTextSkeleton } from '../../../containers/rail-skeleton';

/**
 * `/` left-rail secondary loading skeleton (`@scope` parallel-route slot) — see
 * `(console)/loading.tsx`'s docstring for why this file exists at all.
 *
 * `ScopeEchoRail` resolves the active account/project from `useConsoleScope()` — the `?account=`
 * /`?project=` params plus the loaded account list — and the list is precisely what has not
 * arrived while this renders, so it shows a generic text-line skeleton under the same SCOPE
 * heading.
 */
export default function OverviewScopeLoading() {
  return <RailTextSkeleton label={SCOPE_RAIL_LABEL} lineCount={2} />;
}
