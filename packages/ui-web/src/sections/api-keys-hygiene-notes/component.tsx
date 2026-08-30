import React from 'react';

import { cn } from '../../cn';
import { META_CLASS } from '../../lib/type-roles';
import type { ApiKeysHygieneNotesProps } from './types';

/** One hygiene fact, tone-graded by how actionable it is — `primary` only for the one that needs
 *  attention (an expiry, never as decoration), `META_CLASS` for the two that are merely notable
 *  or audit residue. */
function Part({
  text,
  tone,
}: {
  text: string;
  tone: 'primary' | 'meta';
}) {
  return (
    <span className={tone === 'primary' ? cn(META_CLASS, 'text-primary') : META_CLASS}>{text}</span>
  );
}

// Contract: phase 9 (item 4 — "move them INSIDE the table card, as a single compact status line
// row above the table … one line, not two floating lines on the floor") — one `<p>`, its parts
// joined by " · ", rendered inside the ledger's own `Card` (`apps/console`'s `api-keys-centre.tsx`)
// rather than as a floating block above it. Sans throughout (phase 9 consistency pass — this used
// to be mono; these are status words, not data).
//
// Was the right rail's KEY HYGIENE panel until the owner review of 2026-08-29, then a stack of up
// to three separate lines above the table; its counts have always been a restatement of the
// ledger's Status column, which is exactly what an inline status line is for and exactly what a
// competing side panel is not (console-ui skill "States").
export function ApiKeysHygieneNotes({ hygiene, className }: ApiKeysHygieneNotesProps) {
  const parts: { key: string; text: string; tone: 'primary' | 'meta' }[] = [];

  if (hygiene.expiringCount > 0) {
    parts.push({
      key: 'expiring',
      tone: 'primary',
      text: `${hygiene.expiringCount} key${hygiene.expiringCount === 1 ? '' : 's'} ${
        hygiene.expiringCount === 1 ? 'expires' : 'expire'
      } in ${hygiene.expiringInDays} days`,
    });
  }
  if (hygiene.neverUsedCount > 0) {
    parts.push({
      key: 'never-used',
      tone: 'meta',
      text: `${hygiene.neverUsedCount} key${hygiene.neverUsedCount === 1 ? '' : 's'} never used since creation`,
    });
  }
  if (hygiene.revokedRetainedCount > 0) {
    parts.push({
      key: 'revoked-retained',
      tone: 'meta',
      text: `${hygiene.revokedRetainedCount} revoked key${
        hygiene.revokedRetainedCount === 1 ? '' : 's'
      } retained for audit`,
    });
  }

  if (parts.length === 0) return null;

  return (
    <p className={cn('flex flex-wrap items-center gap-1', className)}>
      {parts.map((part, index) => (
        <React.Fragment key={part.key}>
          {index > 0 ? <span className={META_CLASS}>·</span> : null}
          <Part text={part.text} tone={part.tone} />
        </React.Fragment>
      ))}
    </p>
  );
}
