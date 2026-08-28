import React from 'react';

import { cn } from '../../cn';
import { formatMoney } from '../../lib/money';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { Meter } from '../meter';
import type { ReviewDetailPanelProps } from './types';

function formatSignedCurrency(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

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
                {formatMoney(consumedAmount)}
              </span>
              <span className="text-subtle font-mono text-[11px]">
                of {formatMoney(ceilingAmount)}
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
          placeholder="Optional · visible to requester"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
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
        <Button
          type="button"
          variant="ghost"
          disabled={deciding}
          onClick={() => onDecide('decline', note)}>
          Decline
        </Button>
      </div>
    </div>
  );
}
