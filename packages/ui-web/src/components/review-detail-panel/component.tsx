import React, { useState } from 'react';

import { cn } from '../../cn';
import { formatUsd } from '../../lib/money';
import {
  BODY_CLASS,
  DATA_CLASS,
  LABEL_CLASS,
  META_CLASS,
  METRIC_CLASS,
  SECTION_TITLE_CLASS,
} from '../../lib/type-roles';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { Meter } from '../meter';
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
// reason that rule is `raised` rather than `border` is recorded. Before they existed the stack was
// written out eight times with four accidentally different gaps (4/6/8/12px, two of them off the
// console's 4·8·12·16 spacing scale entirely).
const STACK_CLASS = 'rail-stack';
const SECTION_CLASS = 'rail-section';

// daisy `table table-xs` supplies the history table's own metrics; `rail-history-cell` resets the
// cell padding it ships with, because this table sits in a 280px rail and reads as a list, not a
// grid.
const CELL_CLASS = 'rail-history-cell';

// Contract: task assignment (forms & actions batch) — right-rail CONTENT for Admin
// (admin-budget-review.svg): subject, consumption, requested amount, requester note, history,
// decision note, Approve/Decline pinned to the bottom. Fires onDecide('approve'|'decline', note).
//
// ADR 0010 Decision 4: composes the already-rebuilt `Field`/`Button` rather than hand-rolling a
// second input/button treatment (composition over re-implementation), so both daisy `btn` axes
// and the daisy `input`/`textarea` paint arrive through those. The consumption bar reuses the
// shared `Meter` (`showCaption={false}`) instead of a duplicated track + fill — `Meter`'s own
// caption bundles "$X of $Y" into one string, which does not fit this panel's two-size hierarchy
// (22px metric, 11px "of $Y"), so only the bar is shared and the numerals stay local. History rows
// use daisy `table table-xs` per PRIMITIVES.md. Decision buttons: approve = `primary` (the panel's
// one signal action), decline = `ghost` per PRIMITIVES.md's `review-detail-panel` row.
//
// PRIMITIVES.md row 46 also lists daisy `fieldset`, which is NOT adopted: every block above the
// decision note is read-only display, not a form group, so a `<fieldset>`/`<legend>` around it
// would be false semantics for a screen reader. The one genuine form control here is the decision
// note, and `Field` already owns its Base UI Field wiring and its daisy `textarea` paint.
//
// Every type treatment below is an imported role from lib/type-roles.ts; this component
// declares no type of its own. That is what took it from 99 hand-written utilities to a handful
// of layout classes: the panel was re-typing `metric`, `row`, `label` and both prose steps at
// nearly every line.
//
// converse-frontends#265/#266: consumption, the requester note and history are each optional and
// independently omittable — a caller with no real data source for one of them must leave it
// unset rather than pass a fabricated `0`/`[]`. The panel renders an honest inline line ("Not
// available", "History not loaded.") instead of a fake measurement whenever that happens.
//
// converse-frontends#322: the decision note field's placeholder was "Optional · visible to
// requester" (still what admin-budget-review.svg and the README §8.2 sequence diagram show) —
// wrong in both directions. `RejectAugmentationRequestInput.reason` is a non-optional schema
// field (`authz.cstack:1146-1151`); `ApproveAugmentationRequestInput` has no note field at all
// (`authz.cstack:1132-1136`), so the note is silently dropped on Approve
// (`use-admin-screen.ts`'s `decide.mutationFn` only ever sends `{ requestId }` on that branch).
// This is a functional-contract divergence from the mockup/spec, not a pixel one, so it is not
// resolved in the mockup's favour: the placeholder now reads "Required to decline · not recorded
// on approve", and Decline is blocked client-side on an empty/whitespace-only note before any
// RPC call, with a `Field` error line naming why.
export function ReviewDetailPanel({
  subject,
  requesterEmail,
  submittedAt,
  consumedAmount,
  ceilingAmount,
  warningThreshold = 0.9,
  requestedAmount,
  requesterNote,
  reviewerNote,
  history,
  note,
  onNoteChange,
  onDecide,
  deciding = false,
  className,
}: ReviewDetailPanelProps) {
  // SANCTIONED LOCAL STATE (console-ui skill "State" — pre-submit validation display): whether
  // the reviewer has attempted to Decline with an empty note. Purely a display concern for the
  // CURRENT selection; the host containers key this panel by request id
  // (`admin-rail.tsx`/`admin-centre.tsx`) so switching the selected request always remounts it
  // fresh rather than carrying a stale validation flag onto a different request.
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
        <span className={fieldLabelClassName}>Request</span>
        <h2 className={SECTION_TITLE_CLASS}>{subject}</h2>
        <p className={META_CLASS}>
          {requesterEmail} · {submittedAt}
        </p>
      </div>

      <div className={SECTION_CLASS}>
        <span className={fieldLabelClassName}>Consumption</span>
        {consumedAmount != null && ceilingAmount != null ? (
          <>
            {/* Baseline alignment, so the 22px numeral and the 11px ceiling sit on one line. */}
            <div className="metric-ceiling-row">
              <span className={METRIC_CLASS}>{formatUsd(consumedAmount)}</span>
              <span className={LABEL_CLASS}>of {formatUsd(ceilingAmount)}</span>
            </div>
            <Meter
              value={consumedAmount}
              ceiling={ceilingAmount}
              threshold={warningThreshold}
              showCaption={false}
            />
          </>
        ) : (
          <p className={LABEL_CLASS}>Not available — no consumption query for this request yet.</p>
        )}
      </div>

      <div className={SECTION_CLASS}>
        <span className={fieldLabelClassName}>Requested amount</span>
        <span className={METRIC_CLASS}>{formatSignedCurrency(requestedAmount)}</span>
      </div>

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
        <span className={fieldLabelClassName}>History</span>
        {history == null ? (
          <p className={LABEL_CLASS}>History not loaded.</p>
        ) : history.length === 0 ? (
          <p className={LABEL_CLASS}>No previous refills.</p>
        ) : (
          <table className="table-xs table">
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className={CELL_CLASS}>
                    {/* Tighter than the panel's own stack — a history row's two lines are one
                        unit, not two related blocks. The tightening belongs to the cell, so it
                        applies to whatever this cell comes to hold. */}
                    <div className={STACK_CLASS}>
                      <span className={BODY_CLASS}>{row.label}</span>
                      <span className={LABEL_CLASS}>{row.meta}</span>
                    </div>
                  </td>
                  {/* Numerics are right-aligned (console-ui skill, "Type"). */}
                  <td className={cn(CELL_CLASS, DATA_CLASS, 'text-right')}>
                    {formatSignedCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
