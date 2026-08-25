import React from 'react';

import { cn } from '../../cn';
import type { ApiKeysHygieneRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const API_KEYS_HYGIENE_RAIL_LABEL = 'KEY HYGIENE';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — the right rail's KEY
// HYGIENE section: three read-only lines, each omitted when its count is zero, tone-graded by how
// actionable it is (`primary` only for the one that needs attention — an expiry — never as
// decoration; `soft` for the merely-notable; `subtle` for audit residue).
//
// Deliberately has NO compact-tier trigger of its own: it parameterises nothing, and its counts
// already echo the ledger's own STATUS column (console-ui skill "Shape and layout").
export function ApiKeysHygieneRail({ hygiene, className }: ApiKeysHygieneRailProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {hygiene.expiringCount > 0 ? (
        <p className="font-mono text-[11px] text-primary">
          {hygiene.expiringCount} key{hygiene.expiringCount === 1 ? '' : 's'} expires in{' '}
          {hygiene.expiringInDays} days
        </p>
      ) : null}
      {hygiene.neverUsedCount > 0 ? (
        <p className="font-mono text-[11px] text-soft">
          {hygiene.neverUsedCount} key{hygiene.neverUsedCount === 1 ? '' : 's'} never used since
          creation
        </p>
      ) : null}
      {hygiene.revokedRetainedCount > 0 ? (
        <p className="font-mono text-[11px] text-subtle">
          {hygiene.revokedRetainedCount} revoked key{hygiene.revokedRetainedCount === 1 ? '' : 's'}{' '}
          retained for audit
        </p>
      ) : null}
    </div>
  );
}
