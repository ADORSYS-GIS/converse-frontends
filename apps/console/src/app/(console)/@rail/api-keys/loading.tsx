'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import {
  API_KEYS_LIFECYCLE_RAIL_LABEL,
  ApiKeysLifecycleRail,
} from '@lightbridge/ui-web/src/sections/api-keys-lifecycle-rail';
import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';

import { RailPanelSkeleton, RailTextSkeleton } from '../../../../containers/rail-skeleton';

const noop = () => {};

/**
 * `/api-keys` right-rail loading skeleton — see `@rail/loading.tsx`'s docstring for the same
 * pattern applied to Overview.
 *
 * SCOPE, FILTERS and KEY HYGIENE need live data this static file has no access to, so they render
 * as generic skeletons. `+ New key` and LIFECYCLE are static regardless of load state (a plain
 * button and standing help copy), so they render their real components directly.
 */
export default function ApiKeysRailLoading() {
  return (
    <>
      <RailPanel>
        <Button type="button" variant="primary" className="w-full" onClick={noop}>
          + New key
        </Button>
      </RailPanel>
      <RailPanelSkeleton label={SCOPE_RAIL_LABEL} fieldCount={2} />
      <RailPanelSkeleton label="FILTERS" fieldCount={2} />
      <RailTextSkeleton label="KEY HYGIENE" lineCount={2} />
      <RailPanel label={API_KEYS_LIFECYCLE_RAIL_LABEL}>
        <ApiKeysLifecycleRail />
      </RailPanel>
    </>
  );
}
