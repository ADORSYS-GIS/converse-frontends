import { Dialog } from '@base-ui/react/dialog';
import { Select } from '@base-ui/react/select';
import React from 'react';

import { formatBillingPlanLimits } from '../../lib/billing-plan-limits';
import { Button } from '../button';
import { ErrorLine } from '../error-line';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { SegmentedControl } from '../segmented-control';
import { SelectField } from '../select-field';
import type { CreateApiKeyDialogProps } from './types';
import { Chevron } from '../chevron';
import { META_CLASS } from '../../lib/type-roles';
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

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) and §4 "Forms and
// actions" — the "+ New key" primary's target. No dedicated component is named in the inventory
// for this one, so it follows the shape the other three dialogs share: a modal surface panel,
// radius 2, no shadow, dismissed by Cancel/Escape/backdrop (unlike an AlertDialog, a plain
// Dialog — creating a key is not destructive, so an accidental outside click costs nothing the
// typed-confirm gate exists to prevent). The panel and the plan picker both come from lib now.
//
// Four inputs the schema's CreateApiKeyInput requires, none of which this dialog invents a value
// for: projectId (chosen from the real `scope.projects` catalogue the caller passes in as
// `projectOptions` — live findings #4, 2026-08-30: this dialog used to have no project field of
// its own at all, only a fixed `projectLabel` echo, which is why `+ New key` used to disable
// itself whenever the ledger's own toolbar filter was scoped to "All projects"), name (typed by
// the caller), expiresAt (chosen from presets kept under the operator's documented 90-day ceiling
// with a one-day margin — see the api-keys screen hook for why 89 rather than 90), and
// billingPlan (chosen from the real listBillingPlans catalogue the caller passes in as plans —
// this component never hardcodes a plan id). The selected plan's limits render via
// formatBillingPlanLimits, which is the one place the "absent field means no limit, never 0"
// contract on BillingPlanInfo.limits gets turned into text.
//
// Both label/control stacks are daisy fieldset: a 1fr grid at the 6px gap the form already used.
export function CreateApiKeyDialog({
  open,
  projectOptions,
  projectId,
  onProjectChange,
  projectReason,
  name,
  onNameChange,
  expiryDays,
  expiryOptions,
  onExpiryDaysChange,
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
}: CreateApiKeyDialogProps) {
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  // A placeholder item carries a null value rather than a Select.Value children-render — the
  // same idiom ScopeSelect's own "All projects" placeholder uses, so the trigger always has a
  // real item backing whatever it displays instead of a second, parallel copy of the loading and
  // empty logic living only in the trigger's render.
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
          <Dialog.Title className={DIALOG_TITLE_CLASS}>New API key</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            A key belongs to exactly one project. The secret is shown once, immediately after
            creation.
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <div className="fieldset">
              <SelectField
                label="Project"
                value={projectId ?? ''}
                options={projectOptions}
                onChange={onProjectChange}
              />
              {/* Never a silent disable (console-ui skill "States") — the submit gate this caption
                  explains is `canSubmit`, computed by the container from the SAME ownership/lead
                  check against whichever project is selected above. */}
              {projectReason ? <p className={META_CLASS}>{projectReason}</p> : null}
            </div>

            <Field
              label="Name"
              placeholder="e.g. ci-deploy"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              autoComplete="off"
            />

            <div className="fieldset">
              <span className={fieldLabelClassName}>Expires in</span>
              <SegmentedControl
                aria-label="Expires in"
                options={expiryOptions}
                value={expiryDays}
                onChange={onExpiryDaysChange}
              />
            </div>

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
                <p className={META_CLASS}>{formatBillingPlanLimits(selectedPlan?.limits)}</p>
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
              {submitting ? 'Creating…' : 'Create key'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
