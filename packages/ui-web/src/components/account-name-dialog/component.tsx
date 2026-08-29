import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { AccountNameDialogMode, AccountNameDialogProps } from './types';
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

// Contract: docs/design/console-redesign/README.md §4 "Forms and actions". Deliberately the same
// panel CreateProjectDialog and CreateApiKeyDialog already establish — a modal surface panel,
// radius 2, no shadow, dismissed by Cancel/Escape/backdrop — because naming or creating an
// account is not destructive either. That claim is now enforced rather than asserted: the panel
// is lib/dialog.ts, one definition for all four dialogs. A third dialog shape on the same screen
// would be drift, not craft.
//
// What this form asks for is the whole of what createAccount's input can affect from a console:
//
//  * NOT the id. accounts.id is the caller's JWT sub (ADR-0006); the procedure reads it off the
//    bearer token and CreateAccountInput has no id field. This is the one real difference from
//    CreateProjectDialog, whose model.Project.create verb genuinely needs a caller-supplied
//    createId().
//  * NOT defaultQuota. It IS on CreateAccountInput, but it is a governance tier validated at
//    write time against an operator-configured catalogue that no RPC procedure exposes —
//    listBillingPlans and listModelCatalog have no quota-tier twin. Offering it would mean
//    hardcoding tier ids in the client, which this codebase refuses to do for billing plans and
//    models alike. procedure.updateAccountDefaultQuota is the post-creation path once a
//    catalogue endpoint exists.
//
// leaving exactly one field: the optional display name. That single label/control/hint stack is
// daisy `fieldset` — a 1fr grid at the same 6px gap the rest of the form uses, which is the whole
// of what the hand-written flex column was doing.

const COPY: Record<
  AccountNameDialogMode,
  {
    title: (currentlyNamed: boolean) => string;
    description: (subjectLabel: string) => string;
    hint: (currentlyNamed: boolean) => string;
    primary: string;
    pending: string;
  }
> = {
  create: {
    title: () => 'Create account',
    description: (subjectLabel) =>
      `Created for ${subjectLabel} — your signed-in identity, which is also the account's id.`,
    hint: () => 'Optional. Leave blank to create the account unnamed and name it later.',
    primary: 'Create account',
    pending: 'Creating…',
  },
  rename: {
    title: (currentlyNamed) => (currentlyNamed ? 'Rename account' : 'Name this account'),
    description: (subjectLabel) => `Account ${subjectLabel}.`,
    hint: (currentlyNamed) =>
      currentlyNamed
        ? 'Leave blank to clear the name and go back to unnamed.'
        : 'This account has never been named. A name is a label only — the id stays the only way to address it.',
    primary: 'Save name',
    pending: 'Saving…',
  },
};

export function AccountNameDialog({
  open,
  mode,
  subjectLabel,
  currentlyNamed = false,
  name,
  onNameChange,
  nameError,
  submitting,
  error,
  canSubmit,
  onSubmit,
  onCancel,
}: AccountNameDialogProps) {
  const copy = COPY[mode];
  const title = copy.title(currentlyNamed);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>{title}</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            {copy.description(subjectLabel)}
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <div className="fieldset">
              <Field
                label="Account name"
                placeholder="e.g. Widgets Ltd"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                error={nameError}
                autoComplete="off"
              />
              <p className={DIALOG_HINT_CLASS}>{copy.hint(currentlyNamed)}</p>
            </div>
          </div>

          {error ? (
            <p className={DIALOG_ERROR_CLASS} role="alert">
              {error}
            </p>
          ) : null}

          <div className={DIALOG_ACTIONS_CLASS}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!canSubmit || submitting}
              onClick={onSubmit}>
              {submitting ? copy.pending : copy.primary}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
