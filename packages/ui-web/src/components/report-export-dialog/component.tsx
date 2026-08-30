import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import {
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';
import { ReportExportPanel } from '../report-export-panel';
import type { ReportExportDialogProps } from './types';

// Shell revamp phase 3 (right rail out) — `Monthly report` used to be the persistent right rail's
// own section (`ManageReportRail`); the rail is gone, so it is now a secondary button in
// `PageHeader.action` (beside `+ New project`) that opens this dialog, the same "existing dialog
// wrapper idiom" every other console dialog follows (`lib/dialog.ts`'s shared `DIALOG_*` classes —
// see `CreateProjectDialog` for the idiom this repeats). The report's own scope select stays
// inside `ReportExportPanel`, unchanged.
export function ReportExportDialog({ open, onOpenChange, ...panel }: ReportExportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>Monthly report</Dialog.Title>

          <div className={DIALOG_BODY_CLASS}>
            <ReportExportPanel {...panel} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
