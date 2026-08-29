'use client';

import { ApiKeysControls } from '@lightbridge/ui-web/src/sections/api-keys-controls';
import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';

import { useApiKeysScreen } from './use-api-keys-screen';

/** `/api-keys` — the key filters and the create action, in the LEFT rail beneath the nav. */
export function ApiKeysControlsRail() {
  const screen = useApiKeysScreen();

  return (
    <RailPanel label="Keys">
      <ApiKeysControls
        projectField={screen.projectField}
        statusOptions={screen.statusFilterOptions}
        statusValue={screen.statusFilterValue}
        onStatusChange={screen.setStatusFilter}
        search={screen.search}
        onSearchChange={screen.setSearch}
        onCreate={screen.createKeyEligible ? screen.createKey : undefined}
        createDisabledReason={screen.createKeyReason}
      />
    </RailPanel>
  );
}
