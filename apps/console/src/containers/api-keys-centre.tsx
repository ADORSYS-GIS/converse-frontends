'use client';

import { CreateApiKeyDialog } from '@lightbridge/ui-web/src/components/create-api-key-dialog';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { ApiKeysLedger } from '@lightbridge/ui-web/src/sections/api-keys-ledger';
import { ApiKeysToolbar } from '@lightbridge/ui-web/src/sections/api-keys-toolbar';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

import { useApiKeysScreen } from './use-api-keys-screen';

/**
 * `/api-keys` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * Since the owner review of 2026-08-29 this route supplies no `@rail` and no `@scope` slot: every
 * parameter and the create action live in one always-visible `ApiKeysToolbar` above the ledger, at
 * every tier. `+ New key` therefore appears exactly ONCE — it used to be rendered twice (rail at
 * `lg`, title row below it) with two disabled-state code paths to keep in agreement.
 *
 * `CreateApiKeyDialog` (ticket #319) still mounts exactly once here, the same "one zone owns the
 * dialog" rule `TypedConfirmDialog` follows for Revoke/Delete.
 */
export function ApiKeysCentre() {
  const screen = useApiKeysScreen();

  return (
    <div className="flex flex-col gap-6">
      {/* "API keys", not "Api-Keys": the old title was this route's slug run through a
          title-caser, and disagreed with the nav item sitting beside it. */}
      <ScreenHeading title="API keys" />

      <ApiKeysToolbar
        projectField={screen.projectField}
        statusOptions={screen.statusFilterOptions}
        statusValue={screen.statusFilterValue}
        onStatusChange={screen.setStatusFilter}
        search={screen.search}
        onSearchChange={screen.setSearch}
        onCreate={screen.createKeyEligible ? screen.createKey : undefined}
        createDisabledReason={screen.createKeyReason}
      />

      <ApiKeysHygieneNotes hygiene={screen.hygiene} />

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
      />
    </div>
  );
}
