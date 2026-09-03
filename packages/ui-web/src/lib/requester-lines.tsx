import React from 'react';

import { IdentityLines } from './identity-lines';
import { requesterDisplay, type RefillRequester } from './refill-requester';

/**
 * The refill requester rendered as the two lines every surface shows it as: an identity on the
 * first line, its email — or, for an unresolved id, the id itself — muted underneath.
 *
 * It lives in `lib/` rather than inside either consumer because BOTH the review queue's Requester
 * cell and `ReviewDetailPanel`'s header block render exactly this pair, and a "name over email"
 * treatment spelled twice is how the two drift apart (the same reason `lib/detail-row.ts` and
 * `lib/series-row.tsx` exist). The pair's structure and emphasis now live one level down in
 * `IdentityLines`, which the dashboards' actor table shares — this function's remaining job is the
 * REFILL-specific part: turning a `RefillRequester` into that pair.
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
    <IdentityLines
      label={display.label}
      detail={display.detail}
      subtle={display.subtle}
      className={className}
    />
  );
}
