'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { ScopeSelect } from '@lightbridge/ui-web/src/components/scope-select';
import {
  API_KEYS_FILTERS_RAIL_LABEL,
  ApiKeysFiltersRail,
} from '@lightbridge/ui-web/src/sections/api-keys-filters-rail';
import {
  API_KEYS_HYGIENE_RAIL_LABEL,
  ApiKeysHygieneRail,
} from '@lightbridge/ui-web/src/sections/api-keys-hygiene-rail';
import {
  API_KEYS_LIFECYCLE_RAIL_LABEL,
  ApiKeysLifecycleRail,
} from '@lightbridge/ui-web/src/sections/api-keys-lifecycle-rail';
import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';

import { useApiKeysScreen } from './use-api-keys-screen';

/**
 * `/api-keys` — the right rail, delivered through the `@rail` parallel-route slot.
 *
 * A Fragment, not a wrapping `<div>`: `ConsoleShell`'s rail column puts `divide-y divide-raised`
 * on its direct children, so each section must be a direct DOM child for the hairlines to land
 * between sections rather than around one box.
 *
 * `+ New key` is composed here from `RailPanel` + `Button` rather than given a section of its own:
 * a single CTA is not a zone-level composition. Ticket #320: when the caller cannot create a key
 * (no project scoped, the lead/owner check is still loading, or the caller is neither), the
 * button is disabled and `createKeyReason` is stated beside it as an `InlineStatus` line — never
 * `ErrorLine`, since "not permitted" is not a retryable failure (console-ui skill §states).
 */
export function ApiKeysRail() {
  const screen = useApiKeysScreen();

  return (
    <>
      <RailPanel>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={!screen.createKeyEligible}
          onClick={screen.createKey}>
          + New key
        </Button>
        {screen.createKeyReason ? (
          <InlineStatus className="mt-2">{screen.createKeyReason}</InlineStatus>
        ) : null}
      </RailPanel>
      <RailPanel label={SCOPE_RAIL_LABEL}>
        <ScopeSelect {...screen.scopeSelect} />
      </RailPanel>
      <RailPanel label={API_KEYS_FILTERS_RAIL_LABEL}>
        <ApiKeysFiltersRail
          statusOptions={screen.statusFilterOptions}
          statusValue={screen.statusFilterValue}
          onStatusChange={screen.setStatusFilter}
          search={screen.search}
          onSearchChange={screen.setSearch}
        />
      </RailPanel>
      <RailPanel label={API_KEYS_HYGIENE_RAIL_LABEL}>
        <ApiKeysHygieneRail hygiene={screen.hygiene} />
      </RailPanel>
      <RailPanel label={API_KEYS_LIFECYCLE_RAIL_LABEL}>
        <ApiKeysLifecycleRail />
      </RailPanel>
    </>
  );
}
