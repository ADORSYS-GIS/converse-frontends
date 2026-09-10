import { AlertDialog } from '@base-ui/react/alert-dialog';
import React from 'react';

import { Button } from '../button';
import type { ConfirmDialogProps } from './types';
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';

// Same panel as every other dialog in the library — `lib/dialog.ts` owns all five class strings,
// so this one cannot drift from `TypedConfirmDialog`/`AccountNameDialog`/`CreateProjectDialog`/
// `CreateApiKeyDialog` the way those four once drifted from each other.
//
// Base UI Alert Dialog (ADR 0010 Decision 4) owns the focus trap, the scroll lock and the
// `alertdialog` labelling; its `disablePointerDismissal` is unconditionally true, so a stray click
// on the backdrop never answers the question — only Cancel or Escape do. Initial focus deliberately
// lands on Cancel (the non-destructive answer), unlike `TypedConfirmDialog`, whose initial focus is
// the input the caller has to fill in before Confirm even lights up.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <AlertDialog.Popup initialFocus={cancelRef} className={DIALOG_POPUP_CLASS}>
          <AlertDialog.Title className={DIALOG_TITLE_CLASS}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            {description}
          </AlertDialog.Description>
          <div className={DIALOG_ACTIONS_CLASS}>
            <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
