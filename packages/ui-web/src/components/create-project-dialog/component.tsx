import { Dialog } from '@base-ui/react/dialog';
import { Select } from '@base-ui/react/select';
import React from 'react';

import { Button } from '../button';
import { ErrorLine } from '../error-line';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import type { CreateProjectDialogProps } from './types';
import { Chevron } from '../chevron';
import { OVERLAY_ITEM_CLASS } from '../../lib/overlay';
import {
  SELECT_POPUP_CLASS,
  SELECT_POSITIONER_CLASS,
  SELECT_TRIGGER_CLASS,
} from '../../lib/select';
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_ERROR_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';

// Contract: docs/design/console-redesign/README.md §4 "Forms and actions" — the "+ New project"
// primary's target on the Manage screen (manage-projects.svg). No dedicated component is named in
// the inventory for this one (ticket #303 — this form did not exist before), so it follows
// CreateApiKeyDialog's established shape one row over. Both now render the same panel and the
// same plan picker from lib/dialog.ts and lib/select.ts rather than two byte-identical copies.
//
// The real CreateProjectInput (authz.cstack lines 187-282) is much wider than what this dialog
// collects — allowedModels, modelPolicy, projectQuota, isDefault and status are all readonly on
// the schema, which does NOT remove them from the generated input type (verified empirically,
// converse-frontends PR 194) but does mean the server silently ignores whatever value is sent for
// them. This dialog therefore only ever asks for the fields a create can actually affect: name
// (typed by the caller), billingIdentity ("who's paying" — unique, so a duplicate is the
// realistic failure billingIdentityError renders), and billingPlan (chosen from the real
// listBillingPlans catalogue, same pattern CreateApiKeyDialog established — never hardcoded).
// The manage screen hook fills in the rest of the wire input with inert defaults.
export function CreateProjectDialog({
  open,
  accountLabel,
  name,
  onNameChange,
  nameError,
  billingIdentity,
  onBillingIdentityChange,
  billingIdentityError,
  plans,
  plansLoading,
  plansError,
  onRetryPlans,
  planId,
  onPlanChange,
  submitting,
  error,
  canSubmit,
  onSubmit,
  onCancel,
}: CreateProjectDialogProps) {
  // A placeholder item carries a null value — same idiom CreateApiKeyDialog's own plan picker
  // uses, so the trigger always has a real item backing whatever it displays.
  const planItems: { value: string | null; label: string }[] = plansLoading
    ? [{ value: null, label: 'Loading plans…' }]
    : plans.length === 0
      ? [{ value: null, label: 'No plans available' }]
      : plans.map((plan) => ({ value: plan.id, label: plan.name }));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>New project</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            Created under {accountLabel}.
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <Field
              label="Name"
              placeholder="e.g. widgets-prod"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              error={nameError}
              autoComplete="off"
            />

            <Field
              label="Billing identity"
              placeholder="e.g. widgets-prod-billing"
              value={billingIdentity}
              onChange={(event) => onBillingIdentityChange(event.target.value)}
              error={billingIdentityError}
              autoComplete="off"
            />

            <Select.Root
              items={planItems}
              value={planId}
              onValueChange={(value) => value !== null && onPlanChange(value)}
              disabled={plansLoading || plans.length === 0}>
              <div className="fieldset">
                <Select.Label className={fieldLabelClassName}>Billing plan</Select.Label>
                <Select.Trigger className={SELECT_TRIGGER_CLASS}>
                  <Select.Value />
                  <Select.Icon>
                    <Chevron />
                  </Select.Icon>
                </Select.Trigger>
              </div>
              <Select.Portal>
                <Select.Positioner sideOffset={4} className={SELECT_POSITIONER_CLASS}>
                  <Select.Popup className={SELECT_POPUP_CLASS}>
                    <Select.List>
                      {planItems.map((item) => (
                        <Select.Item
                          key={item.value ?? ''}
                          value={item.value}
                          className={OVERLAY_ITEM_CLASS}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>

            {plansError ? (
              <ErrorLine message={plansError} onRetry={onRetryPlans} retryLabel="Retry" />
            ) : null}
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
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
