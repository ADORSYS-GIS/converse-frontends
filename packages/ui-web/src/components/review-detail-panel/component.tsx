import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/cva';
import type { ReviewDetailPanelProps } from './types';

function formatCurrency(amount: number): string {
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${amount < 0 ? '−' : ''}$${grouped}.${fraction}`;
}

function formatSignedCurrency(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(amount))}`;
}

// Contract: task assignment (forms & actions batch) — right-rail CONTENT for Admin
// (admin-budget-review.svg): subject, consumption, requested amount, requester note, history,
// decision note, Approve/Decline pinned to the bottom. Fires onDecide('approve'|'decline', note).
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
  const ratio = ceilingAmount > 0 ? Math.min(consumedAmount / ceilingAmount, 1) : 0;
  const overThreshold = ratio >= warningThreshold;

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
          <span className="font-mono text-[22px] leading-[1.2] text-ink">{formatCurrency(consumedAmount)}</span>
          <span className="font-mono text-[11px] text-subtle">of {formatCurrency(ceilingAmount)}</span>
        </div>
        <div className="h-[4px] w-full rounded-[2px] bg-raised">
          <div
            className={cn('h-full rounded-[2px]', overThreshold ? 'bg-primary' : 'bg-soft')}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
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
          <ul className="flex flex-col gap-2">
            {history.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs text-soft">{row.label}</span>
                  <span className="font-mono text-xs text-soft">{formatSignedCurrency(row.amount)}</span>
                </div>
                <span className="font-mono text-[11px] text-subtle">{row.meta}</span>
              </li>
            ))}
          </ul>
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
        <Button type="button" variant="secondary" disabled={deciding} onClick={() => onDecide('decline', note)}>
          Decline
        </Button>
      </div>
    </div>
  );
}
