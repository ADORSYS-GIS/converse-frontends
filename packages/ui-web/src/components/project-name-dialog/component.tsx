import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { ProjectNameDialogProps } from './types';
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

// Contract: docs/design/console-redesign/README.md §4 "Forms and actions" — deliberately the same
// panel `AccountNameDialog` established one row over, through the same one definition
// (`lib/dialog.ts`). Renaming a project is not destructive, so it gets the ordinary dialog rather
// than `TypedConfirmDialog`'s type-to-confirm gate.
//
// Why a sibling of `AccountNameDialog` rather than a `subject` prop on it: the two dialogs differ
// in the only thing that matters here — nullability. `Account.name` is `String?` and a blank
// submit is a legal write that CLEARS the name (`normalizeAccountName` maps `''` to `NULL`), so
// that dialog's hint promises exactly that. `Project.name` is a plain `String`, so blank is not a
// value at all and the hint has to say the opposite. Folding two contradictory contracts behind
// one `mode` string would make the component's own copy table the place that decides whether a
// column is nullable.
//
// What it asks for is the whole of what a console can change about a project's identity: the
// display name. Every other field on `model.Project` is either `@readonly` with its own dedicated
// procedure (`projectQuota` → `setProjectQuota`, `modelPolicy` → `setProjectModelPolicy`,
// `allowedModels` → `setProjectAllowedModels`, `status` → `disableProject`/`enableProject`,
// `isDefault` → `setDefaultProject`) or a catalogue-validated id (`billingPlan`) — none of which
// this dialog is, and none of which it pretends to be.
export function ProjectNameDialog({
  open,
  projectId,
  currentName,
  name,
  onNameChange,
  nameError,
  submitting,
  error,
  canSubmit,
  onSubmit,
  onCancel,
}: ProjectNameDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>Rename project</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            {`Currently ${currentName} — project ${projectId}.`}
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <div className="fieldset">
              <Field
                label="Project name"
                placeholder="e.g. gateway-prod"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                error={nameError}
                autoComplete="off"
              />
              <p className={DIALOG_HINT_CLASS}>
                A label only — the project id stays the same, and every API key, budget and report
                already attached to it is unaffected.
              </p>
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
              {submitting ? 'Saving…' : 'Save name'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
