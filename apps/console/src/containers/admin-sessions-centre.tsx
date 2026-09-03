'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import {
  SessionDetailPanel,
  SessionLedger,
  SessionLedgerControls,
} from '@lightbridge/ui-web/src/sections/session-ledger';

import { SESSION_PAGE_SIZES } from '../client/url-state';
import { useTranslation } from '../i18n/client';
import { useAdminSessionsScreen } from './use-admin-sessions-screen';

/**
 * `/admin/sessions` — the centre column, and the WHOLE of this route (converse-frontends#450,
 * story C7): the estate-wide session ledger, its filters in `PageControls`, and the row detail
 * that closes one session or every session for a person.
 *
 * It closes the console half of lightbridge-authz ADR-0020 Follow-up 4. Before this the sessions
 * table was revocable but not enumerable — `revokeOwnSessions` ("log out everywhere") and
 * `revokeSubjectSessions` (offboard this person) were the only two ways to touch it, both
 * write-only and both all-or-nothing. A revocable table nobody can list is not a control.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * Row detail is a `BottomSheet` at EVERY tier, never a side drawer and never a rail: ADR 0013 D2/
 * phase E deleted the console's whole rail wiring, and no `/admin/*` route carries one at any
 * tier, so there is no `lg`+ surface to hand this off to and no `portalClassName` tier gate to
 * write. The sheet is keyed by session id so switching rows remounts the panel rather than
 * carrying a stale confirmation onto a different session.
 *
 * **Filters are OUTSIDE the card** (owner directive 2026-09-03, ADR 0015 amendment A2). They were
 * never inside this one — this screen was the pattern the directive generalised — but they have
 * moved out of `PageHeader.controls` into a `PageControls` row of their own, in three groups:
 *
 *  1. `slice` — status, kind, and the two-control user picker (`SessionLedgerControls`).
 *  2. `paging` — rows per page, on the trailing edge. NOT a filter: it changes how much of the
 *     same set you see, never which set, which is why it sat behind an `sm:ms-auto` inside the old
 *     cluster and is a group of its own now.
 *  3. `reset`, added by `PageControls` itself, and only while something is actually narrowing the
 *     ledger (`screen.filtersActive`).
 */
export function AdminSessionsCentre() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const screen = useAdminSessionsScreen();

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('sessions.title')}
          subtitle={t('sessions.subtitle', { count: screen.pagination.shown })}
        />

        <PageControls
          label={tCommon('controls.row-filters')}
          resetLabel={tCommon('controls.reset')}
          onReset={screen.filtersActive ? screen.resetFilters : undefined}
          groups={[
            {
              id: 'slice',
              label: tCommon('controls.slice'),
              children: (
                <SessionLedgerControls
                  status={screen.statusFilter}
                  onStatusChange={screen.setStatusFilter}
                  kind={screen.kindFilter}
                  onKindChange={screen.setKindFilter}
                  search={screen.search}
                  onSearchChange={screen.setSearch}
                  userOptions={screen.userOptions}
                  selectedUser={screen.selectedUser}
                  onSelectedUserChange={screen.setSelectedUser}
                />
              ),
            },
            {
              id: 'paging',
              label: tCommon('controls.paging'),
              align: 'end',
              children: (
                <SelectField
                  label={tCommon('controls.per-page')}
                  layout="inline"
                  value={String(screen.pageSize)}
                  options={SESSION_PAGE_SIZES.map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                  onChange={(next) => screen.setPageSize(Number(next))}
                />
              ),
            },
          ]}
        />

        <Card>
          <SessionLedger
            sessions={screen.sessions}
            loading={screen.loading}
            error={screen.errorMessage}
            onRetry={screen.retry}
            status={screen.status}
            emptyMessage={screen.emptyMessage}
            selectedSessionId={screen.selectedSessionId}
            onSelectSession={screen.selectSession}
            pagination={screen.pagination}
          />
        </Card>
      </div>

      <BottomSheet
        open={screen.selectedSessionId !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={t('sessions.sheet-title')}
        subtitle={screen.detail?.id}>
        {screen.detail ? (
          <SessionDetailPanel
            key={screen.detail.id}
            session={screen.detail}
            onRequestClose={screen.requestClose}
            closeConfirmOpen={screen.closeConfirmOpen}
            onConfirmClose={screen.confirmClose}
            onCancelClose={screen.cancelClose}
            onRequestCloseAll={screen.requestCloseAll}
            closeAllConfirmOpen={screen.closeAllConfirmOpen}
            onConfirmCloseAll={screen.confirmCloseAll}
            onCancelCloseAll={screen.cancelCloseAll}
            busy={screen.revoking}
            error={screen.revokeError}
            success={screen.revokeSuccess}
          />
        ) : null}
      </BottomSheet>
    </>
  );
}
