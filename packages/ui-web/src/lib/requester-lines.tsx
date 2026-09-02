import React from 'react';

import { cn } from '../cn';
import { requesterDisplay, type RefillRequester } from './refill-requester';
import { META_CLASS } from './type-roles';

/**
 * The refill requester rendered as the two lines every surface shows it as: an identity on the
 * first line, its email — or, for an unresolved id, the id itself — muted underneath.
 *
 * It lives in `lib/` rather than inside either consumer because BOTH the review queue's Requester
 * cell and `ReviewDetailPanel`'s header block render exactly this pair, and a "name over email"
 * treatment spelled twice is how the two drift apart (the same reason `lib/detail-row.ts` and
 * `lib/series-row.tsx` exist). It deliberately sets no font SIZE of its own on the first line: a
 * table cell (12px, `console-table`) and a definition-list value (13px, `BODY_CLASS`) are
 * different type contexts, and the one thing this owns is the pair's structure and its emphasis —
 * `ink` for a real name, `subtle` for every labelled sentinel.
 */
export function RequesterLines({
  requester,
  className,
}: {
  requester: RefillRequester;
  className?: string;
}) {
  const display = requesterDisplay(requester);

  return (
    <span className={cn('flex flex-col', className)}>
      <span className={display.subtle ? 'text-subtle' : 'text-ink'}>{display.label}</span>
      {/* One treatment for the second line whatever it holds: an email and a raw user id are both
          secondary facts about the same person, and giving the id its own mono role here would
          make the sentinel row read as louder than a resolved one. */}
      {display.detail ? <span className={META_CLASS}>{display.detail}</span> : null}
    </span>
  );
}
