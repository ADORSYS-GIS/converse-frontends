import React, { useState } from 'react';

import { cn } from '../../cn';
import { formatUsd } from '../../lib/money';
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

// Contract: task assignment (forms & actions batch) — right-rail CONTENT for Admin
// (admin-budget-review.svg): subject, consumption, requested amount, requester note, history,
// decision note, Approve/Decline pinned to the bottom. Fires onDecide('approve'|'decline', note).
//
// ADR 0010 Decision 4: composes the already-rebuilt `Field`/`Button` rather than hand-rolling a
// second input/button treatment (composition over re-implementation). The consumption bar reuses
// the shared `Meter` (`showCaption={false}`) instead of a duplicated `raised` track + fill —
// `Meter`'s own caption bundles "$X of $Y" into one string, which doesn't fit this panel's
// two-size hierarchy (22px metric, 11px "of $Y"), so only the bar is shared and the numerals stay
// local. History rows move from a `<ul>` to daisy `table table-xs` per PRIMITIVES.md. Decision
// buttons: approve = `primary` (the panel's one signal action), decline = `ghost` per
// PRIMITIVES.md's `review-detail-panel` row (was `secondary`/bordered before this migration —
// noted divergence, not a mockup pixel disagreement).
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
    <div className={cn('flex h-full flex-col gap-5', className)}>
      <div className="flex flex-col gap-1">
        <span className={fieldLabelClassName}>Request</span>
        <h2 className="text-ink font-mono text-base">{subject}</h2>
        <p className="text-subtle font-sans text-[10px]">
          {requesterEmail} · {submittedAt}
        </p>
      </div>

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <span className={fieldLabelClassName}>Consumption</span>
        {consumedAmount != null && ceilingAmount != null ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-ink font-mono text-[22px] leading-[1.2]">
                {formatUsd(consumedAmount)}
              </span>
              <span className="text-subtle font-mono text-[11px]">
                of {formatUsd(ceilingAmount)}
              </span>
            </div>
            <Meter
              value={consumedAmount}
              ceiling={ceilingAmount}
              threshold={warningThreshold}
              showCaption={false}
            />
          </>
        ) : (
          <p className="text-subtle font-mono text-[11px]">
            Not available — no consumption query for this request yet.
          </p>
        )}
      </div>

      <div className="border-border flex flex-col gap-1 border-t pt-4">
        <span className={fieldLabelClassName}>Requested amount</span>
        <span className="text-ink font-mono text-[22px] leading-[1.2]">
          {formatSignedCurrency(requestedAmount)}
        </span>
      </div>

      {requesterNote ? (
        <div className="border-border flex flex-col gap-1.5 border-t pt-4">
          <span className={fieldLabelClassName}>Note from requester</span>
          <p className="text-soft font-sans text-[11px] leading-[1.45]">{requesterNote}</p>
        </div>
      ) : null}

      {reviewerNote ? (
        <div className="border-border flex flex-col gap-1.5 border-t pt-4">
          <span className={fieldLabelClassName}>Reviewer note</span>
          <p className="text-soft font-sans text-[11px] leading-[1.45]">{reviewerNote}</p>
        </div>
      ) : null}

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <span className={fieldLabelClassName}>History</span>
        {history == null ? (
          <p className="text-subtle font-mono text-[11px]">History not loaded.</p>
        ) : history.length === 0 ? (
          <p className="text-subtle font-mono text-[11px]">No previous refills.</p>
        ) : (
          <table className="table-xs table">
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="p-0 py-1 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-soft font-mono text-xs">{row.label}</span>
                      <span className="text-subtle font-mono text-[11px]">{row.meta}</span>
                    </div>
                  </td>
                  <td className="text-soft p-0 py-1 text-right align-top font-mono text-xs">
                    {formatSignedCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-border border-t pt-4">
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

      <div className="border-border mt-auto flex flex-col gap-3 border-t pt-4">
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
