import React from 'react';

import { cn } from '../../cn';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { RowActionGroup } from '../../components/row-action-group';
import { SelectField } from '../../components/select-field';
import { Toggle } from '../../components/toggle';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
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
 * The toolbar carries the two knobs the backend's own filter supports and nothing invented beside
 * them — a role filter and `includeRevoked`. The "Grant role" primary is NOT here: it is the
 * screen's action and lives in `PageHeader.action`, the same split `+ New key` and `+ New project`
 * already use, so the card holds exactly toolbar + table + pager (console-ui skill "Card is the
 * default zone container", supplied by the container).
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
  roleFilter,
  onRoleFilterChange,
  roles,
  includeRevoked,
  onIncludeRevokedChange,
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

  // A true empty COLLECTION versus an empty FILTER are different statements, and the toolbar above
  // is what tells them apart — so the explainer names the filter when one is applied.
  const filtered = roleFilter !== ALL_ROLES || includeRevoked;
  const isEmpty = !loading && !error && grants.length === 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className={INLINE_ROW_CLASS}>
        <SelectField
          label="Role"
          layout="inline"
          value={roleFilter}
          options={[
            { value: ALL_ROLES, label: 'All roles' },
            ...roles.map((role) => ({ value: role, label: role })),
          ]}
          onChange={onRoleFilterChange}
        />
        <Toggle
          label="Include revoked"
          checked={includeRevoked}
          onCheckedChange={onIncludeRevokedChange}
        />
      </div>

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState
          headline={filtered ? 'No grants match this filter' : 'No platform roles are granted'}
          explainer={
            filtered
              ? 'Clear the role filter, or include revoked grants, to widen the view.'
              : 'Every signed-in person holds whatever their account membership maps to. Grant a platform role to give someone more than that.'
          }
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
