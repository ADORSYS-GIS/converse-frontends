'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { CreateApiKeyDialog } from '@lightbridge/ui-web/src/components/create-api-key-dialog';
import { EmptyState } from '@lightbridge/ui-web/src/components/empty-state';
import { SecretReveal } from '@lightbridge/ui-web/src/components/secret-reveal';
import { ApiKeysControls } from '@lightbridge/ui-web/src/sections/api-keys-controls';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { ApiKeysLedger } from '@lightbridge/ui-web/src/sections/api-keys-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useApiKeysScreen } from './use-api-keys-screen';

/**
 * `/api-keys` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * Shell revamp phase 2: every parameter lives in `PageHeader.controls` (`ApiKeysControls`,
 * horizontal) now — the left rail it used to live in is gone. `+ New key` is `PageHeader.action`,
 * the emphasised, right-most control on the title row — it appears exactly ONCE, same invariant
 * the pre-revamp rail/title-row split existed to protect, just relocated. Same button, reused
 * verbatim as the `EmptyState` CTA when the project has no keys at all (2026-08-30 revamp brief).
 *
 * `CreateApiKeyDialog` (ticket #319) still mounts exactly once here, the same "one zone owns the
 * dialog" rule `TypedConfirmDialog` follows for Revoke/Delete.
 *
 * The ledger's toolbar + table + pager now sit inside ONE `Card` (2026-08-30 revamp brief) — the
 * same `OverviewCentre`/`ProjectsCentre` split, this file supplies the card, `ApiKeysLedger`
 * supplies what is inside it.
 *
 * Addition D (2026-08-30 owner round, "a card inside a card?") — CREATE's one-time secret moved
 * INTO `CreateApiKeyDialog` itself (a second step of the same modal instance,
 * `screen.createKeyDialog.result`/`onDone`), replacing the floor-level `SecretReveal` this screen
 * used to render nested inside `ApiKeysLedger`'s own tree — itself nested inside the `Card` below,
 * i.e. a bordered panel inside a bordered panel. ROTATE has no dialog of its own to fold into, so
 * its result still renders as `SecretReveal`, but now as a sibling ABOVE the `Card`, never nested
 * inside it — `screen.secretReveal` is `null` whenever the create dialog owns the display instead
 * (see `use-api-keys-screen.ts`'s own doc comment on the two never overlapping).
 */
export function ApiKeysCentre() {
  const screen = useApiKeysScreen();
  const subtitle = screen.scopeAccountLabel
    ? `${screen.scopeAccountLabel} · ${screen.scopeProjectLabel}`
    : undefined;

  const newKeyButton = (
    <Button
      type="button"
      variant="primary"
      disabled={!screen.createKeyEligible}
      title={screen.createKeyReason}
      onClick={screen.createKey}>
      + New key
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* "API keys", not "Api-Keys": the old title was this route's slug run through a
          title-caser, and disagreed with the nav item sitting beside it. */}
      <PageHeader
        title="API keys"
        subtitle={subtitle}
        controls={
          <ApiKeysControls
            projectField={screen.projectField}
            statusOptions={screen.statusFilterOptions}
            statusValue={screen.statusFilterValue}
            onStatusChange={screen.setStatusFilter}
            search={screen.search}
            onSearchChange={screen.setSearch}
          />
        }
        action={newKeyButton}
      />

      <CreateApiKeyDialog {...screen.createKeyDialog} />

      {screen.secretReveal ? (
        <SecretReveal
          heading={screen.secretReveal.heading}
          description={screen.secretReveal.description}
          secret={screen.secretReveal.secret}
          onDismiss={screen.dismissSecret}
        />
      ) : null}

      <Card>
        {/* Phase 9 (item 4) — one compact status line above the table, INSIDE its own card, not
            floating on the floor between the header and the ledger. */}
        <ApiKeysHygieneNotes hygiene={screen.hygiene} className="mb-4" />
        <ApiKeysLedger
          keys={screen.rows}
          loading={screen.loading}
          loadingRowCount={8}
          error={screen.errorMessage}
          onRetry={screen.retry}
          emptyState={
            <EmptyState
              headline="No API keys in this project"
              explainer="Keys authenticate requests to the Lightbridge API. Each belongs to exactly one project."
              action={newKeyButton}
            />
          }
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
          sort={screen.sort}
          onSortChange={screen.onSortChange}
          pagination={screen.pagination}
        />
      </Card>
    </div>
  );
}
