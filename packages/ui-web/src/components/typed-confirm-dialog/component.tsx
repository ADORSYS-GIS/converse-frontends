import { AlertDialog } from '@base-ui/react/alert-dialog';
import React, { useRef, useState } from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { TypedConfirmDialogProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — destructive gate. Modal dialog
// (`surface`, radius 2, no shadow — separation via a `muted/80` backdrop), names the object,
// states what survives/what does not, requires the object name typed exactly; primary
// (destructive proceed) stays disabled until exact match; cancel secondary. Esc = cancel.
//
// ADR 0010 Decision 4 (Base UI Alert Dialog): deletes the hand-rolled `querySelectorAll` focus
// trap, the manual `Escape` keydown listener and the manual `aria-modal`/`aria-labelledby`/
// `aria-describedby` wiring — Base UI owns focus trap, scroll lock, initial/final focus and the
// `role="alertdialog"` labelling. Base UI's `disablePointerDismissal` is unconditionally forced
// `true` for `AlertDialog` (never overridable), which is exactly the old backdrop's behaviour:
// there was never a click handler on it, so an outside click did nothing — a destructive
// confirmation should only close via Cancel or Escape, never a stray click.
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
  // Base UI keeps this component instance mounted across `open` toggles (only the portaled
  // popup content unmounts) — reset the typed value on every open->close->open cycle, so a
  // stale exact-match never survives from a previous confirmation target. Adjusted during
  // render (React's documented pattern for "reset state when a prop changes"), not in a
  // `useEffect`, so there is no extra commit/cascading render.
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
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-muted/80" />
        <AlertDialog.Popup
          initialFocus={inputRef}
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-surface p-6 outline-hidden">
          <AlertDialog.Title className="font-mono text-base text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 font-sans text-[11px] leading-[1.45] text-soft">
            {description}
          </AlertDialog.Description>
          <div className="mt-4">
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
            <p className="mt-3 font-mono text-[11px] leading-[1.4] text-primary" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-3">
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
