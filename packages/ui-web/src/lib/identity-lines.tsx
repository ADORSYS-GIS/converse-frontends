import React from 'react';

import { cn } from '../cn';
import { META_CLASS } from './type-roles';

/**
 * An identity rendered as the two lines every surface in this console shows one as: who it is on
 * the first line, the fact that disambiguates them — an email, an owner, a parent account, or the
 * raw id when nothing resolved — muted underneath.
 *
 * Extracted from `requester-lines.tsx` (which now composes it) when the declarative dashboards'
 * actor table needed the identical treatment for users, accounts and projects
 * (converse-frontends#448). Two surfaces spelling "name over email" separately is exactly how the
 * two drift apart, and a third would have made that certain.
 *
 * It deliberately sets no font SIZE on the first line: a table cell (12px, `console-table`) and a
 * definition-list value (13px, `BODY_CLASS`) are different type contexts. What it owns is the
 * pair's STRUCTURE and its emphasis — `ink` for a real name, `subtle` for a labelled sentinel — and
 * one treatment for the second line whatever it holds, so a sentinel row never reads as louder
 * than a resolved one.
 */
export function IdentityLines({
  label,
  detail,
  subtle,
  className,
}: {
  label: string;
  /** The supporting line. Omitted entirely when there is nothing true to put there — never filled
   *  with a placeholder. */
  detail?: string;
  subtle?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-col', className)}>
      <span className={subtle ? 'text-subtle' : 'text-ink'}>{label}</span>
      {detail ? <span className={META_CLASS}>{detail}</span> : null}
    </span>
  );
}
