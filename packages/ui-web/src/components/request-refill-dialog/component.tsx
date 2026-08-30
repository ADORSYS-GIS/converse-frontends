import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import { Button } from '../button';
import { SelectField } from '../select-field';
import type { RequestRefillDialogProps } from './types';
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_ERROR_CLASS,
  DIALOG_HINT_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';

// The owner's second correction, alongside the rail's own return (2026-08-30): "budget refill
// form disappeared" — the refill control had regressed to firing ONLY past `BUDGET_BREACH_
// THRESHOLD` and, even then, instantly mutating a single fixed amount on one click with no
// confirmation surface at all. This dialog is the form that replaces that one-click mutate,
// reachable from three standing triggers that all open the SAME instance (`?refill=`,
// `use-request-refill-dialog.ts`): the Budget card's own secondary header action, its prominent
// breach-state button (now opening this dialog with the smallest allowed amount preselected
// instead of mutating blind), and the inspector rail's quick-settings "Request refill" row.
//
// Deliberately the same panel `AccountNameDialog`/`CreateProjectDialog` already establish
// (`lib/dialog.ts`) — asking for a refill is not destructive either.
//
// NO requester-note field: `RequestBudgetRefillInput` (authz-budget) carries no such column, and
// there is no other honest place to source one from (lightbridge-authz#559 — the backend gap;
// this is a comment recording it, not a fabricated field standing in for it).
export function RequestRefillDialog({
  open,
  onOpenChange,
  accountLabel,
  amountOptions,
  amountMicros,
  onAmountChange,
  submitting,
  error,
  canSubmit,
  onSubmit,
}: RequestRefillDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>Request a budget refill</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            Sends {accountLabel} an augmentation request an operator reviews and approves or
            declines — it does not change the budget itself.
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <div className="fieldset">
              <SelectField
                label="Amount"
                value={amountMicros}
                options={amountOptions}
                onChange={onAmountChange}
              />
              <p className={DIALOG_HINT_CLASS}>
                Amounts come from the account's active refill policy — this console cannot ask for
                anything outside it.
              </p>
            </div>
          </div>

          {error ? (
            <p className={DIALOG_ERROR_CLASS} role="alert">
              {error}
            </p>
          ) : null}

          <div className={DIALOG_ACTIONS_CLASS}>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!canSubmit || submitting}
              onClick={onSubmit}>
              {submitting ? 'Requesting…' : 'Request refill'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
