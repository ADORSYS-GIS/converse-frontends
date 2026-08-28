import { Dialog } from '@base-ui/react/dialog';
import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { ErrorLine } from '../error-line';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import type { CreateProjectDialogProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 "Forms and actions" — the `+ New project`
// primary's target on the Manage screen (manage-projects.svg). No dedicated component is named in
// the inventory for this one (ticket #303 — this form did not exist before), so it follows
// `CreateApiKeyDialog`'s established shape one row over: a modal `surface` panel, no border, no
// shadow, radius 2, dismissed by Cancel/Escape/backdrop — creating a project is not destructive.
//
// The real `CreateProjectInput` (authz.cstack:187-282) is much wider than what this dialog collects
// — `allowedModels`/`modelPolicy`/`projectQuota`/`isDefault`/`status` are all `@readonly` on the
// schema, which does NOT remove them from the generated input type (verified empirically,
// converse-frontends#194) but does mean the server silently ignores whatever value is sent for
// them. This dialog therefore only ever asks for the fields a create can actually affect: `name`
// (typed by the caller), `billingIdentity` ("who's paying" — `@unique`, so a duplicate is the
// realistic failure `billingIdentityError` renders), and `billingPlan` (chosen from the real
// `listBillingPlans` catalogue, same pattern `CreateApiKeyDialog` established — never hardcoded).
// `use-manage-screen.ts` fills in the rest of the wire input with inert defaults.
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
  // A placeholder item carries `value: null` — same idiom `CreateApiKeyDialog`'s own plan picker
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
        <Dialog.Backdrop className="bg-muted/80 fixed inset-0 z-50" />
        <Dialog.Popup className="bg-surface fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] p-6 outline-hidden">
          <Dialog.Title className="text-ink font-mono text-base">New project</Dialog.Title>
          <Dialog.Description className="text-soft mt-2 font-sans text-[11px] leading-[1.45]">
            Created under {accountLabel}.
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-4">
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

            <div className="flex flex-col gap-1.5">
              <Select.Root
                items={planItems}
                value={planId}
                onValueChange={(value) => value !== null && onPlanChange(value)}
                disabled={plansLoading || plans.length === 0}>
                <Select.Label className={fieldLabelClassName}>Billing plan</Select.Label>
                <Select.Trigger
                  className={cn(
                    'border-border bg-chrome flex h-[30px] w-full items-center justify-between gap-2 rounded-[2px] border px-3',
                    'text-soft data-[popup-open]:border-primary focus-visible:border-primary font-mono text-sm outline-hidden',
                    'disabled:cursor-not-allowed disabled:opacity-60'
                  )}>
                  <Select.Value />
                  <Select.Icon>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 8 8"
                      className="stroke-subtle h-2 w-2 shrink-0"
                      fill="none"
                      strokeWidth="1.4">
                      <path d="M1 3l3 3 3-3" />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={4} className="outline-hidden select-none">
                    <Select.Popup className="bg-surface z-50 w-(--anchor-width) rounded-[2px] py-1 font-mono outline-hidden">
                      <Select.List>
                        {planItems.map((item) => (
                          <Select.Item
                            key={item.value ?? ''}
                            value={item.value}
                            className="text-soft data-[highlighted]:bg-raised data-[highlighted]:text-ink flex cursor-pointer items-center px-3 py-1.5 text-xs outline-hidden">
                            <Select.ItemText>{item.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>

            {plansError ? (
              <ErrorLine message={plansError} onRetry={onRetryPlans} retryLabel="Retry" />
            ) : null}
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
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
