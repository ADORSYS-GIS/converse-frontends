'use client';

import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';

import { RailTextSkeleton } from '../../../containers/rail-skeleton';

/**
 * `/` left-rail secondary loading skeleton (`@scope` parallel-route slot) — see
 * `(console)/loading.tsx`'s docstring for why this file exists at all.
 *
 * `ScopeEchoRail` reads the active account/project off `useConsoleScopeContext()`, unavailable to
 * this static file, so it renders as a generic text-line skeleton under the same SCOPE heading.
 */
export default function OverviewScopeLoading() {
  return <RailTextSkeleton label={SCOPE_RAIL_LABEL} lineCount={2} />;
}
