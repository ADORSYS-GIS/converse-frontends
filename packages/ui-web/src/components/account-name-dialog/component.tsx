import { Dialog } from '@base-ui/react/dialog';
import React from 'react';

import { Button } from '../button';
import { Field } from '../field';
import type { AccountNameDialogMode, AccountNameDialogProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 "Forms and actions". Deliberately the same
// panel `CreateProjectDialog` and `CreateApiKeyDialog` already establish — a modal `surface`
// panel, no border, no shadow, radius 2, dismissed by Cancel/Escape/backdrop — because naming or
// creating an account is not destructive either. No new visual language was invented for it: the
// design contract for this treatment is already locked (PRIMITIVES.md), and a third dialog shape
// on the same screen would be drift, not craft.
//
// What this form asks for is the whole of what `createAccount`'s input can affect from a console:
//
//  * NOT the id. `accounts.id` is the caller's JWT `sub` (ADR-0006); the procedure reads it off
//    the bearer token and `CreateAccountInput` has no `id` field. This is the one real difference
//    from `CreateProjectDialog`, whose `model.Project.create` verb genuinely needs a
//    caller-supplied `createId()`.
//  * NOT `defaultQuota`. It IS on `CreateAccountInput`, but it is a governance tier validated at
//    write time against an operator-configured catalogue that no RPC procedure exposes —
//    `listBillingPlans`/`listModelCatalog` have no quota-tier twin. Offering it would mean
//    hardcoding tier ids in the client, which this codebase refuses to do for billing plans and
//    models alike. `procedure.updateAccountDefaultQuota` is the post-creation path once a
//    catalogue endpoint exists.
//
// leaving exactly one field: the optional display name.

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
        <Dialog.Backdrop className="bg-muted/80 fixed inset-0 z-50" />
        <Dialog.Popup className="bg-surface fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] p-6 outline-hidden">
          <Dialog.Title className="text-ink font-mono text-base">{title}</Dialog.Title>
          <Dialog.Description className="text-soft mt-2 font-sans text-[11px] leading-[1.45]">
            {copy.description(subjectLabel)}
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-1.5">
            <Field
              label="Account name"
              placeholder="e.g. Widgets Ltd"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              error={nameError}
              autoComplete="off"
            />
            <p className="text-subtle font-sans text-[11px] leading-[1.45]">
              {copy.hint(currentlyNamed)}
            </p>
          </div>

          {error ? (
            <p className="text-primary mt-4 font-mono text-[11px] leading-[1.4]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
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
