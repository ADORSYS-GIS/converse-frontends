import { AlertDialog } from '@base-ui/react/alert-dialog';
import React, { useRef, useState } from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { TypedConfirmDialogProps } from './types';
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_ERROR_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';

// Contract: docs/design/console-redesign/README.md §4 — destructive gate. Modal dialog
// (surface, radius 2, no shadow — separation via a muted/80 backdrop), names the object,
// states what survives and what does not, requires the object name typed exactly; primary
// (destructive proceed) stays disabled until exact match; cancel secondary. Esc = cancel.
//
// ADR 0010 Decision 4 (Base UI Alert Dialog): deletes the hand-rolled querySelectorAll focus
// trap, the manual Escape keydown listener and the manual aria modal / labelledby / describedby
// wiring — Base UI owns focus trap, scroll lock, initial and final focus, and the alertdialog
// labelling. Base UI's disablePointerDismissal is unconditionally forced true for AlertDialog
// (never overridable), which is exactly the old backdrop's behaviour: there was never a click
// handler on it, so an outside click did nothing — a destructive confirmation should only close
// via Cancel or Escape, never a stray click.
//
// Every class this renders now comes from lib/dialog.ts, shared with the three non-destructive
// dialogs. It used to cap at 400px where they capped at 420 and to skip the overlay hairline;
// all four docstrings already claimed one shared panel, so that was drift, not intent.
export function TypedConfirmDialog({
  open,
  title,
  description,
  objectName,
  inputPlaceholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  error,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  // Base UI keeps this component instance mounted across open toggles (only the portaled popup
  // content unmounts) — reset the typed value on every open/close/open cycle, so a stale exact
  // match never survives from a previous confirmation target. Adjusted during render (React's
  // documented pattern for "reset state when a prop changes"), not in an effect, so there is no
  // extra commit or cascading render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTyped('');
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = typed === objectName;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <AlertDialog.Popup initialFocus={inputRef} className={DIALOG_POPUP_CLASS}>
          <AlertDialog.Title className={DIALOG_TITLE_CLASS}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            {description}
          </AlertDialog.Description>
          <div className={DIALOG_BODY_CLASS}>
            <Field
              ref={inputRef}
              label={`Type "${objectName}" to confirm`}
              placeholder={inputPlaceholder ?? objectName}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
            />
          </div>
          {error ? (
            <p className={DIALOG_ERROR_CLASS} role="alert">
              {error}
            </p>
          ) : null}
          <div className={DIALOG_ACTIONS_CLASS}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="primary" disabled={!matches} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
