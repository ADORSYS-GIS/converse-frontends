'use client';

import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';

import { RailTextSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/api-keys` left-rail secondary loading skeleton (`@scope` slot) — same `ScopeEchoRail` as `/`,
 * see `@scope/loading.tsx`'s docstring.
 */
export default function ApiKeysScopeLoading() {
  return <RailTextSkeleton label={SCOPE_RAIL_LABEL} lineCount={2} />;
}
