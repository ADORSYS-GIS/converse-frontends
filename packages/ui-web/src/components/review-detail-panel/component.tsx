import React, { useState } from 'react';

import { cn } from '../../cn';
import { DETAIL_LIST_CLASS, DETAIL_ROW_CLASS } from '../../lib/detail-row';
import { formatUsd } from '../../lib/money';
import { BODY_CLASS, LABEL_CLASS, METRIC_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import type { ReviewDetailPanelProps } from './types';

function formatSignedCurrency(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatUsd(Math.abs(amount))}`;
}

// converse-frontends#322: `RejectAugmentationRequestInput.reason` is non-optional server-side by
// design (`authz.cstack:1146-1151`), so an empty Decline must never leave the browser — it fails
// with only a generic message otherwise. This is the client-side mirror of that constraint: an
// empty string counts as invalid, not just an absent field (matching the schema's own comment on
// why `reason` was made non-optional rather than left to the runtime check alone).
const NOTE_REQUIRED_MESSAGE = 'A note is required to decline this request.';

// The panel's two layout idioms — a vertical stack of related lines, and the same stack preceded
// by a hairline rule — are `rail-stack` / `rail-section` in theme.css, which is also where the
// reason that rule is `raised` rather than `border` is recorded.
const STACK_CLASS = 'rail-stack';
const SECTION_CLASS = 'rail-section';

// Admin review revamp (phase 6): the Consumption meter and the History table are both gone —
// `consumedAmount`/`ceilingAmount`/`warningThreshold`/`history` were permanently `null`/never
// fetched upstream (no consumption or history query is wired up anywhere in `apps/console`;
// backend issues already filed), so the blocks they fed could only ever render their own "not
// available"/"not loaded" line. A block that can never hold a real value is not a state, it is a
// promise this panel cannot keep — see `sections/review-queue`'s own doc comment for the sibling
// correction on the Consumed/Ceiling table columns.
//
// The requested amount is now the panel's visual anchor (`METRIC_CLASS`, the role a hero figure
// gets elsewhere in the console) rather than a small line below a meter that no longer exists.
// Project/account/submitted-at follow as a definition list — `lib/detail-row.ts`'s shared
// term/value geometry, the same one `AccountSettings`/`ProjectSettings` build their own rows
// from — reflowed to fit the 420px `DetailSheet` cleanly now that there is one less block fighting
// it for room. Decision actions stay pinned to the foot of the rail via the enclosing
// `rail-panel-stack`'s own last-child rule.
//
// ADR 0010 Decision 4: composes the already-rebuilt `Field`/`Button` rather than hand-rolling a
// second input/button treatment. Decision buttons: approve = `primary` (the panel's one signal
// action), decline = `ghost` per PRIMITIVES.md's `review-detail-panel` row.
//
// converse-frontends#265/#266/#322: the requester note is optional and independently omittable —
// a caller with no real data source for it must leave it unset rather than pass a fabricated
// string. The decision note field's placeholder is "Required to decline · not recorded on
// approve" (`RejectAugmentationRequestInput.reason` is non-optional; `ApproveAugmentationRequestInput`
// carries no note field at all, so the note is silently dropped on Approve — see
// `use-admin-screen.ts`'s `decide.mutationFn`), and Decline is blocked client-side on an
// empty/whitespace-only note before any RPC call, with a `Field` error line naming why.
export function ReviewDetailPanel({
  projectLabel,
  accountLabel,
  submittedAt,
  requestedAmount,
  requesterNote,
  reviewerNote,
  note,
  onNoteChange,
  onDecide,
  deciding = false,
  className,
}: ReviewDetailPanelProps) {
  // SANCTIONED LOCAL STATE (console-ui skill "State" — pre-submit validation display): whether
  // the reviewer has attempted to Decline with an empty note. Purely a display concern for the
  // CURRENT selection; the host container (`admin-centre.tsx`, and its Storybook/refine-mock
  // counterparts) keys this panel by request id so switching the selected request always remounts
  // it fresh rather than carrying a stale validation flag onto a different request.
  const [noteMissing, setNoteMissing] = useState(false);

  const handleNoteChange = (value: string) => {
    if (noteMissing) setNoteMissing(false);
    onNoteChange(value);
  };

  const handleDecline = () => {
    // Whitespace-only counts as empty too — matches the schema comment's own "an empty string,
    // not just an absent field" framing.
    if (note.trim().length === 0) {
      setNoteMissing(true);
      return;
    }
    onDecide('decline', note);
  };

  return (
    // The stack below is the full-height column AND the pin that puts its last child — the
    // decision actions — at the foot of the rail however short the content above them is.
    <div className={cn('rail-panel-stack', className)}>
      <div className={STACK_CLASS}>
        <span className={fieldLabelClassName}>Requested amount</span>
        <span className={METRIC_CLASS}>{formatSignedCurrency(requestedAmount)}</span>
      </div>

      <dl className={cn(DETAIL_LIST_CLASS, SECTION_CLASS)}>
        <div className={DETAIL_ROW_CLASS}>
          <dt className={LABEL_CLASS}>Project</dt>
          <dd className={BODY_CLASS}>{projectLabel}</dd>
        </div>
        <div className={DETAIL_ROW_CLASS}>
          <dt className={LABEL_CLASS}>Account</dt>
          <dd className={BODY_CLASS}>{accountLabel}</dd>
        </div>
        <div className={DETAIL_ROW_CLASS}>
          <dt className={LABEL_CLASS}>Submitted</dt>
          <dd className={BODY_CLASS}>{submittedAt}</dd>
        </div>
      </dl>

      {requesterNote ? (
        <div className={SECTION_CLASS}>
          <span className={fieldLabelClassName}>Note from requester</span>
          <p className={BODY_CLASS}>{requesterNote}</p>
        </div>
      ) : null}

      {reviewerNote ? (
        <div className={SECTION_CLASS}>
          <span className={fieldLabelClassName}>Reviewer note</span>
          <p className={BODY_CLASS}>{reviewerNote}</p>
        </div>
      ) : null}

      <div className={SECTION_CLASS}>
        <Field
          label="Decision note"
          multiline
          rows={3}
          placeholder="Required to decline · not recorded on approve"
          value={note}
          onChange={(event) => handleNoteChange(event.target.value)}
          error={noteMissing ? NOTE_REQUIRED_MESSAGE : undefined}
        />
      </div>

      {/* The pin lives on the enclosing stack's last-child rule, not here: sitting at the foot of
          the rail is a property of being last in that column, not of being the decision block. */}
      <div className={SECTION_CLASS}>
        <Button
          type="button"
          variant="primary"
          disabled={deciding}
          onClick={() => onDecide('approve', note)}>
          Approve {formatSignedCurrency(requestedAmount)}
        </Button>
        <Button type="button" variant="ghost" disabled={deciding} onClick={handleDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
}
