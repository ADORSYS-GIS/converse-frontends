import React from 'react';

import { cn } from '../../cn';
import type { ApiKeysHygieneNotesProps } from './types';

// Contract: three read-only lines annotating the key ledger, each omitted when its count is
// zero, tone-graded by how actionable it is (`primary` only for the one that needs attention —
// an expiry — never as decoration; `soft` for the merely-notable; `subtle` for audit residue).
//
// Was the right rail's KEY HYGIENE panel until the owner review of 2026-08-29; now an inline
// status block directly above the table, beside the ledger's own status summary. Its counts have
// always been a restatement of the ledger's Status column, which is exactly what an inline status
// line is for and exactly what a competing side panel is not (console-ui skill "States").
export function ApiKeysHygieneNotes({ hygiene, className }: ApiKeysHygieneNotesProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {hygiene.expiringCount > 0 ? (
        <p className="text-primary font-mono text-[11px]">
          {hygiene.expiringCount} key{hygiene.expiringCount === 1 ? '' : 's'}{' '}
          {hygiene.expiringCount === 1 ? 'expires' : 'expire'} in {hygiene.expiringInDays} days
        </p>
      ) : null}
      {hygiene.neverUsedCount > 0 ? (
        <p className="text-soft font-mono text-[11px]">
          {hygiene.neverUsedCount} key{hygiene.neverUsedCount === 1 ? '' : 's'} never used since
          creation
        </p>
      ) : null}
      {hygiene.revokedRetainedCount > 0 ? (
        <p className="text-subtle font-mono text-[11px]">
          {hygiene.revokedRetainedCount} revoked key{hygiene.revokedRetainedCount === 1 ? '' : 's'}{' '}
          retained for audit
        </p>
      ) : null}
    </div>
  );
}
