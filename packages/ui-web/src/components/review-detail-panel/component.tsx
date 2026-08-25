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
export function ReviewDetailPanel({
  subject,
  requesterEmail,
  submittedAt,
  consumedAmount,
  ceilingAmount,
  warningThreshold = 0.9,
  requestedAmount,
  requesterNote,
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
        <h3 className="font-mono text-base text-ink">{subject}</h3>
        <p className="font-sans text-[10px] text-subtle">
          {requesterEmail} · {submittedAt}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className={fieldLabelClassName}>Consumption</span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[22px] leading-[1.2] text-ink">{formatMoney(consumedAmount)}</span>
          <span className="font-mono text-[11px] text-subtle">of {formatMoney(ceilingAmount)}</span>
        </div>
        <Meter value={consumedAmount} ceiling={ceilingAmount} threshold={warningThreshold} showCaption={false} />
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <span className={fieldLabelClassName}>Requested amount</span>
        <span className="font-mono text-[22px] leading-[1.2] text-ink">{formatSignedCurrency(requestedAmount)}</span>
      </div>

      {requesterNote ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <span className={fieldLabelClassName}>Note from requester</span>
          <p className="font-sans text-[11px] leading-[1.45] text-soft">{requesterNote}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className={fieldLabelClassName}>History</span>
        {history.length === 0 ? (
          <p className="font-mono text-[11px] text-subtle">No previous refills.</p>
        ) : (
          <table className="table table-xs">
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="p-0 py-1 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-soft">{row.label}</span>
                      <span className="font-mono text-[11px] text-subtle">{row.meta}</span>
                    </div>
                  </td>
                  <td className="p-0 py-1 text-right align-top font-mono text-xs text-soft">
                    {formatSignedCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <Field
          label="Decision note"
          multiline
          rows={3}
          placeholder="Optional · visible to requester"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="primary"
          disabled={deciding}
          onClick={() => onDecide('approve', note)}
        >
          Approve {formatSignedCurrency(requestedAmount)}
        </Button>
        <Button type="button" variant="ghost" disabled={deciding} onClick={() => onDecide('decline', note)}>
          Decline
        </Button>
      </div>
    </div>
  );
}
