'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { CreateApiKeyDialog } from '@lightbridge/ui-web/src/components/create-api-key-dialog';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ScopeSelect } from '@lightbridge/ui-web/src/components/scope-select';
import {
  API_KEYS_FILTERS_RAIL_LABEL,
  ApiKeysFiltersRail,
} from '@lightbridge/ui-web/src/sections/api-keys-filters-rail';
import { ApiKeysLedger } from '@lightbridge/ui-web/src/sections/api-keys-ledger';
import { SCOPE_RAIL_LABEL } from '@lightbridge/ui-web/src/sections/scope-rail';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

import { UrlSectionSheetTrigger } from './url-section-sheet-trigger';
import { useApiKeysScreen } from './use-api-keys-screen';

/**
 * `/api-keys` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * `+ New key` appears twice by design (console-ui skill "Shape and layout"): in the rail at `lg`,
 * where the rail owns the action that consumes its own parameters, and in the title row below
 * `lg` where the rail does not exist. Both call the same `createKey`, and both are disabled with
 * the same `createKeyReason` (ticket #320). `CreateApiKeyDialog` (ticket #319) mounts exactly once
 * here — never inside the rail — the same "one zone owns the dialog" rule `TypedConfirmDialog`
 * follows for Revoke/Delete.
 */
export function ApiKeysCentre() {
  const screen = useApiKeysScreen();

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeading
        title="Api-Keys"
        subline={`${screen.scopeAccountLabel} / ${screen.scopeProjectLabel}`}
        sublineActions={
          <UrlSectionSheetTrigger
            id="scope"
            icon="scope"
            triggerLabel="Open scope"
            label={SCOPE_RAIL_LABEL}>
            <ScopeSelect {...screen.scopeSelect} />
          </UrlSectionSheetTrigger>
        }
        actions={
          <div className="lg:hidden">
            <Button
              type="button"
              variant="primary"
              disabled={!screen.createKeyEligible}
              onClick={screen.createKey}>
              + New key
            </Button>
            {screen.createKeyReason ? (
              <InlineStatus className="mt-2">{screen.createKeyReason}</InlineStatus>
            ) : null}
          </div>
        }
      />

      <CreateApiKeyDialog {...screen.createKeyDialog} />

      <ApiKeysLedger
        keys={screen.rows}
        loading={screen.loading}
        loadingRowCount={8}
        error={screen.errorMessage}
        onRetry={screen.retry}
        statusSummary={screen.statusSummary}
        emptyMessage={screen.emptyMessage}
        secretReveal={screen.secretReveal}
        onDismissSecret={screen.dismissSecret}
        onRotate={screen.rotate}
        onRequestRevoke={screen.requestRevoke}
        revokeTarget={screen.revokeTarget}
        onConfirmRevoke={screen.confirmRevoke}
        onCancelRevoke={screen.cancelRevoke}
        isAdmin={screen.isAdmin}
        onRequestDelete={screen.requestDelete}
        deleteTarget={screen.deleteTarget}
        onConfirmDelete={screen.confirmDelete}
        onCancelDelete={screen.cancelDelete}
        selectedRowKeys={screen.selectedRowKeys}
        onSelectRow={screen.selectRow}
        pagination={screen.pagination}
        toolbarActions={
          <UrlSectionSheetTrigger
            id="filters"
            icon="filter"
            triggerLabel="Open filters"
            label={API_KEYS_FILTERS_RAIL_LABEL}>
            <ApiKeysFiltersRail
              statusOptions={screen.statusFilterOptions}
              statusValue={screen.statusFilterValue}
              onStatusChange={screen.setStatusFilter}
              search={screen.search}
              onSearchChange={screen.setSearch}
            />
          </UrlSectionSheetTrigger>
        }
      />
    </div>
  );
}
