import React from 'react';

import { cn } from '../../cn';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { RowActionGroup } from '../../components/row-action-group';
import { RequesterLines } from '../../lib/requester-lines';
import { META_CLASS } from '../../lib/type-roles';
import { GRANT_AUTHOR_CLI_LABEL } from './types';
import type { PlatformGrantAuthor, PlatformRoleGrantRow, PlatformRoleGrantsProps } from './types';

/** `''` is the role filter's own "every role" value — it is not, and can never be, a real role. */
export const ALL_ROLES = '';

/**
 * The stated limit on the audit view, rendered as a caption under the table rather than left for
 * the reader to infer from a page that stops. `listPlatformRoleGrants` pages by `grantedAt`
 * newest-first with no total count anywhere in the contract, so "N of M" would be a fabricated
 * figure — the honest statement is the ordering plus the pager.
 */
const ORDER_CAPTION =
  'Newest grants first. Revoked grants are kept — a revocation is a record, not a deletion.';

function GrantAuthorCell({ author }: { author: PlatformGrantAuthor }) {
  // The one branch `RequesterLines` cannot express, and the one that must never read as a missing
  // value: a NULL `granted_by` is the CLI bootstrap, the only way the first admin can exist.
  // Rendered `subtle` like every sentinel, but it is a fact, not an absence.
  if (author.kind === 'cli') {
    return <span className="text-subtle">{GRANT_AUTHOR_CLI_LABEL}</span>;
  }
  return <RequesterLines requester={author} />;
}

/**
 * `/admin/roles`' ledger: who holds which platform role, who granted it, when, and why.
 *
 * 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): THE TOOLBAR IS
 * GONE from this card. The two knobs the backend's own filter supports — a role filter and
 * `includeRevoked` — are `PlatformRoleGrantsControls` now, a fragment the container drops into a
 * `PageControls` group on the floor. What is left in the card is the table, its caption and its
 * pager. The "Grant role" primary was never here either: it is `PageHeader.action`, the same split
 * `+ New key` and `+ New project` already use.
 *
 * This section keeps `filtered` (a boolean, not the filter values) because the two zero-row
 * readings are different statements and only the caller knows which applies — and it now says so
 * as an `InlineStatus` above a still-rendered table rather than as a centred placard, which is the
 * console's rule for an empty RESULT (the `Reset filters` affordance that pairs with it lives in
 * the same `PageControls` row as the filters themselves).
 *
 * **The Revoked column appears only when revoked rows can be present.** A `Status` column reading
 * "Active" on every row of the default view is noise that says nothing; when `includeRevoked` is
 * on, the revocation timestamp is the whole point of the view and gets its own column. The revoke
 * ROW ACTION disappears for an already-revoked row for the same reason `revokePlatformRole`
 * refuses one: the original `revoked_at` is the audit fact, and offering to overwrite it would be
 * offering to destroy the thing the row exists for.
 */
export function PlatformRoleGrants({
  grants,
  loading = false,
  loadingRowCount = 5,
  error,
  onRetry,
  includeRevoked = false,
  filtered = false,
  onRequestRevoke,
  identityStatus,
  pagination,
  className,
}: PlatformRoleGrantsProps) {
  const columns: LedgerColumn<PlatformRoleGrantRow>[] = [
    {
      key: 'user',
      header: 'User',
      width: '200px',
      accessor: (row) => <RequesterLines requester={row.user} />,
    },
    {
      key: 'role',
      header: 'Role',
      width: '150px',
      // `data`, not `text`: a role string is an identifier the operator types verbatim into the
      // revoke confirmation, not prose — the same treatment every id in the console gets.
      kind: 'data',
      accessor: (row) => <span className="text-ink">{row.role}</span>,
    },
    {
      key: 'granted-by',
      header: 'Granted by',
      width: '180px',
      accessor: (row) => <GrantAuthorCell author={row.grantedBy} />,
    },
    // 145px is what `YYYY-MM-DD HH:mm` needs to stay on ONE line in the table's mono role (at 130
    // it wrapped). Every other fixed column is held as tight as its own content allows so the
    // Reason column — the only cell holding free prose, and the only one that gets unreadable when
    // squeezed — keeps a usable width in the audit view, where five fixed columns compete for the
    // same row.
    {
      key: 'granted-at',
      header: 'Granted',
      width: '145px',
      kind: 'data',
      accessor: (row) => row.grantedAt,
    },
    ...(includeRevoked
      ? [
          {
            key: 'revoked-at',
            header: 'Revoked',
            width: '145px',
            kind: 'data' as const,
            // An em dash, not a blank: the cell is answering "when was this revoked" with
            // "it was not", which is a real answer.
            accessor: (row: PlatformRoleGrantRow) => row.revokedAt ?? '—',
          },
        ]
      : []),
    {
      key: 'reason',
      header: 'Reason',
      accessor: (row) =>
        row.reason ? (
          // `title` carries the full text for a reason too long for the column — the same idiom
          // `SelectFieldOption.reason` already uses for a disabled option. A grant's reason is
          // free prose an operator wrote, so it has no honest maximum width; truncating it with no
          // way to read the rest would hide the one field this table exists to preserve.
          <span title={row.reason}>{row.reason}</span>
        ) : (
          // No reason was recorded. Labelled, never blank — the console owns its sentinels.
          <span className="text-subtle">No reason given</span>
        ),
    },
  ];

  // A true empty COLLECTION versus an empty FILTER are different statements, and only the caller
  // knows which applies now that the filters themselves live a row above this card.
  const isEmpty = !loading && !error && grants.length === 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isEmpty && filtered ? (
        // An empty RESULT: the filters are what emptied it, and `PageControls`' own `Reset
        // filters` is the way back — an inline line, never a placard.
        <InlineStatus>
          No grants match this filter. Clear the role filter, or include revoked grants, to widen
          the view.
        </InlineStatus>
      ) : isEmpty ? (
        <EmptyState
          headline="No platform roles are granted"
          explainer="Every signed-in person holds whatever their account membership maps to. Grant a platform role to give someone more than that."
        />
      ) : (
        <>
          {identityStatus ? <InlineStatus>{identityStatus}</InlineStatus> : null}
          <LedgerTable
            columns={columns}
            data={grants}
            rowKey={(row) => row.id}
            loading={loading}
            loadingRowCount={loadingRowCount}
            renderRowActions={(row) =>
              row.revokedAt ? null : (
                <RowActionGroup
                  aria-label={`Actions for ${row.role}`}
                  actions={[
                    {
                      key: 'revoke',
                      label: 'Revoke',
                      onClick: () => onRequestRevoke(row),
                      emphasis: 'strong',
                    },
                  ]}
                />
              )
            }
          />
          <p className={META_CLASS}>{ORDER_CAPTION}</p>
          {pagination ? (
            <Pagination
              shown={pagination.shown}
              unit="grants"
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
