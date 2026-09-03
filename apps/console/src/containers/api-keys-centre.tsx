'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { CreateApiKeyDialog } from '@lightbridge/ui-web/src/components/create-api-key-dialog';
import { EmptyState } from '@lightbridge/ui-web/src/components/empty-state';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { SecretReveal } from '@lightbridge/ui-web/src/components/secret-reveal';
import { ApiKeysControls } from '@lightbridge/ui-web/src/sections/api-keys-controls';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { ApiKeysLedger } from '@lightbridge/ui-web/src/sections/api-keys-ledger';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../i18n/client';
import { useApiKeysScreen } from './use-api-keys-screen';

/**
 * `/api-keys` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * Every parameter lives in `PageControls` (owner directive 2026-09-03, ADR 0015 amendment A2) — a
 * full-width control row on the floor between the title and the ledger's `Card`, in two groups:
 * `scope` (the project select — which project's keys these are) and `slice` (status and search —
 * which of that project's keys are shown). They are parted by a hairline because they are two
 * different questions, and `Reset filters` clears only the second: re-scoping the screen to another
 * project is not what "reset filters" says.
 *
 * `+ New key` is `PageHeader.action`, the emphasised, right-most control on the title row — it
 * appears exactly ONCE, and the same button is reused verbatim as the `EmptyState` CTA when the
 * project has no keys at all.
 *
 * `CreateApiKeyDialog` (ticket #319) still mounts exactly once here, the same "one zone owns the
 * dialog" rule `TypedConfirmDialog` follows for Revoke/Delete.
 *
 * The `Card` holds the hygiene line, the table and the pager — content, not controls. Its own
 * `toolbarActions` slot is deleted: a filter trigger inside the card it filters is exactly what the
 * directive rules out.
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
  // Only the control row's own group names are translated here — the rest of this screen is
  // English still, and is named as such in ADR 0017's "what is not translated yet" list
  // (converse-frontends#490). The `common:controls.*` bundle exists because EVERY screen's control
  // row needs the same handful of words, so spelling them in English here would have been new
  // untranslated copy on a surface that already has a translated home for it.
  const { t: tCommon } = useTranslation('common');
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
      <PageHeader title="API keys" subtitle={subtitle} action={newKeyButton} />

      <PageControls
        label={tCommon('controls.row-filters')}
        resetLabel={tCommon('controls.reset')}
        onReset={screen.filtersActive ? screen.resetFilters : undefined}
        groups={[
          {
            id: 'scope',
            label: tCommon('controls.scope'),
            children: <SelectField {...screen.projectField} layout="inline" hideLabel />,
          },
          {
            id: 'slice',
            label: tCommon('controls.slice'),
            children: (
              <ApiKeysControls
                statusOptions={screen.statusFilterOptions}
                statusValue={screen.statusFilterValue}
                onStatusChange={screen.setStatusFilter}
                search={screen.search}
                onSearchChange={screen.setSearch}
              />
            ),
          },
        ]}
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
          canDelete={screen.canDelete}
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
