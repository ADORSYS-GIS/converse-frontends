import { Dialog } from '@base-ui/react/dialog';
import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { formatBillingPlanLimits } from '../../lib/billing-plan-limits';
import { Button } from '../button';
import { ErrorLine } from '../error-line';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { SegmentedControl } from '../segmented-control';
import type { CreateApiKeyDialogProps } from './types';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) / §4 "Forms and actions" —
// the `+ New key` primary's target. No dedicated component is named in the inventory for this
// one, so it follows `TypedConfirmDialog`'s own established shape one row over: a modal `surface`
// panel, no border, no shadow, radius 2, dismissed by Cancel/Escape/backdrop (unlike
// `AlertDialog`, a plain `Dialog` — creating a key is not destructive, so an accidental outside
// click closing it costs nothing the typed-confirm gate exists to prevent).
//
// Three inputs the schema's `CreateApiKeyInput` (authz.cstack:537) requires and none of which
// this dialog invents a value for: `name` (typed by the caller), `expiresAt` (chosen from presets
// kept under the operator's documented 90-day ceiling with a 1-day margin — see
// `use-api-keys-screen.ts`'s `EXPIRY_DAY_OPTIONS` for why 89 rather than 90), and `billingPlan`
// (chosen from the real `listBillingPlans` catalogue the caller passes in as `plans` — this
// component never hardcodes a plan id). The selected plan's `limits` render via
// `formatBillingPlanLimits`, which is the one place the "absent field means no limit, never 0"
// contract on `BillingPlanInfo.limits` (authz.cstack:566) gets turned into text.
export function CreateApiKeyDialog({
  open,
  projectLabel,
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
  // A placeholder item carries `value: null` rather than a `Select.Value` children-render — the
  // same idiom `ScopeSelect`'s own "All projects" placeholder uses, so the trigger always has a
  // real item backing whatever it displays instead of a second, parallel copy of the loading/
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
        <Dialog.Backdrop className="bg-muted/80 fixed inset-0 z-50" />
        <Dialog.Popup className="bg-surface fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] p-6 outline-hidden">
          <Dialog.Title className="text-ink font-mono text-base">New API key</Dialog.Title>
          <Dialog.Description className="text-soft mt-2 font-sans text-[11px] leading-[1.45]">
            Scoped to {projectLabel}. The secret is shown once, immediately after creation.
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-4">
            <Field
              label="Name"
              placeholder="e.g. ci-deploy"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              autoComplete="off"
            />

            <div className="flex flex-col gap-1.5">
              <span className={fieldLabelClassName}>Expires in</span>
              <SegmentedControl
                aria-label="Expires in"
                options={expiryOptions}
                value={expiryDays}
                onChange={onExpiryDaysChange}
              />
            </div>

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
              <p className="text-subtle font-mono text-[11px] leading-[1.4]">
                {formatBillingPlanLimits(selectedPlan?.limits)}
              </p>
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
              {submitting ? 'Creating…' : 'Create key'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
