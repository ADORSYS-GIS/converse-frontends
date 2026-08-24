import React, { useEffect, useId, useRef, useState } from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { TypedConfirmDialogProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — destructive gate. Modal dialog
// (`surface`, radius 2, no shadow — separation via a `muted/80` backdrop), names the object,
// states what survives/what does not, requires the object name typed exactly; primary
// (destructive proceed) stays disabled until exact match; cancel secondary. Esc = cancel.
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
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = typed === objectName;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const container = dialogRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'input, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted/80">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[400px] rounded-[2px] bg-surface p-6"
      >
        <h2 id={titleId} className="font-mono text-base text-ink">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 font-sans text-[11px] leading-[1.45] text-soft">
          {description}
        </div>
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
      </div>
    </div>
  );
}
