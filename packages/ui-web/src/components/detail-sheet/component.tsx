import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import { DIALOG_BACKDROP_CLASS } from '../../lib/dialog';
import { META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { DetailSheetProps } from './types';

// The console visual revamp's detail sheet (phase 1 foundation brief): a fixed right panel that
// slides the record's own detail in over the content column, rather than a route change or a
// full-screen modal. Base UI's Dialog owns open/close state, the focus trap and the Escape/
// backdrop dismissal — the same primitive every other console dialog already delegates to (see
// `components/account-name-dialog` for the shared idiom this follows); `detail-sheet-panel`
// (theme.css) is its paint, docked to the trailing edge instead of centred.
export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  footer,
  children,
}: DetailSheetProps) {
  return (
    // Discards the extra `(eventDetails, reason)` arguments Base UI's own `onOpenChange` passes
    // (the `Dialog.Root` type is wider than this component's single-boolean callback contract) —
    // callers should see exactly `onOpenChange(open: boolean)`, not Base UI's internal event shape.
    <Dialog.Root open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className="detail-sheet-panel">
          <div className="detail-sheet-header">
            <div>
              <Dialog.Title className={SECTION_TITLE_CLASS}>{title}</Dialog.Title>
              {subtitle ? (
                <Dialog.Description className={META_CLASS}>{subtitle}</Dialog.Description>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Close"
              onClick={() => onOpenChange(false)}>
              ×
            </Button>
          </div>

          <div className="detail-sheet-body">{children}</div>

          {footer ? <div className="detail-sheet-footer">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
