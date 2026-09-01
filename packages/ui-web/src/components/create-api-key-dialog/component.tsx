import { Dialog } from '@base-ui/react/dialog';
import { Field as BaseField } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { formatBillingPlanLimits } from '../../lib/billing-plan-limits';
import { Button } from '../button';
import { ErrorLine } from '../error-line';
import { Field } from '../field';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import { SegmentedControl } from '../segmented-control';
import { SelectField } from '../select-field';
import type { CreateApiKeyDialogProps } from './types';
import { META_CLASS } from '../../lib/type-roles';
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
// radius 2, no shadow, dismissed by Cancel/Escape/backdrop on the FORM step (unlike an
// AlertDialog, a plain Dialog — creating a key is not destructive, so an accidental outside click
// on the form costs nothing the typed-confirm gate exists to prevent). The panel and the plan
// picker both come from lib now.
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
//
// ── Addition D (2026-08-30 owner round, "a card inside a card? why is the form in a modal and
// the result not?") ──────────────────────────────────────────────────────────────────────────
//
// The one-time secret a successful create returns used to render as a SEPARATE floor-level
// strip (`SecretReveal`, nested inside `ApiKeysLedger`'s own `Card` — literally a card inside a
// card), while the FORM that produced it was a modal. Same object, two different surfaces, and
// the modal one simply vanished the moment the write succeeded. This dialog is now two steps in
// the SAME modal instance instead: `result` absent renders the form; `result` present replaces it
// in place with the secret step — heading, a "copy it now" explainer, the secret itself (Base
// UI's `Field.Root`/`Input` pair, the identical accessible wiring `SecretReveal` already
// established: the Description is announced WITH the control, not left to sit beside it by
// proximity alone), and Copy. `onDone` is the step's only exit: `disablePointerDismissal` blocks
// an outside click outright, and `onOpenChange` below refuses an Escape-triggered close too, the
// same way `AlertDialog`'s own `disablePointerDismissal` already blocks pointer dismissal
// unconditionally for a destructive gate (`TypedConfirmDialog`'s own doc comment) — here the
// stakes are "you may lose the only copy of this secret," not destructive data loss, but the same
// "only the explicit control closes this" contract applies.
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
  result,
  onDone,
}: CreateApiKeyDialogProps) {
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  // A placeholder item carries the `''` sentinel rather than a Select.Value children-render — the
  // same idiom `ScopeSelect`'s own "All projects" placeholder uses now that both render through
  // `SelectField` (unify-select, issue #368), so the trigger always has a real item backing
  // whatever it displays instead of a second, parallel copy of the loading and empty logic living
  // only in the trigger's render. The whole control is `disabled` whenever this placeholder is
  // showing (below), so `''` is never a committable selection.
  const planItems: { value: string; label: string }[] = plansLoading
    ? [{ value: '', label: 'Loading plans…' }]
    : plans.length === 0
      ? [{ value: '', label: 'No plans available' }]
      : plans.map((plan) => ({ value: plan.id, label: plan.name }));

  const showResult = result != null;

  return (
    <Dialog.Root
      open={open}
      // Only the secret step refuses pointer dismissal — the form step keeps the ordinary
      // "outside click cancels" behaviour every other non-destructive dialog in this library has.
      disablePointerDismissal={showResult}
      onOpenChange={(nextOpen, eventDetails) => {
        if (nextOpen) return;
        if (
          showResult &&
          (eventDetails.reason === 'escape-key' || eventDetails.reason === 'outside-press')
        ) {
          // The secret step's own contract: Done is the only way out.
          return;
        }
        onCancel();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          {showResult ? (
            <>
              <Dialog.Title className={DIALOG_TITLE_CLASS}>{result.heading}</Dialog.Title>
              <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
                {result.description}
              </Dialog.Description>

              <div className={DIALOG_BODY_CLASS}>
                <SecretField secret={result.secret} />
              </div>

              <div className={DIALOG_ACTIONS_CLASS}>
                <Button type="button" variant="primary" onClick={onDone}>
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
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
                  {/* Never a silent disable (console-ui skill "States") — the submit gate this
                      caption explains is `canSubmit`, computed by the container from the SAME
                      ownership/lead check against whichever project is selected above. */}
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

                <div className="fieldset">
                  <SelectField
                    label="Billing plan"
                    value={planId ?? ''}
                    options={planItems}
                    onChange={(value) => value !== '' && onPlanChange(value)}
                    disabled={plansLoading || plans.length === 0}
                  />
                  <p className={META_CLASS}>{formatBillingPlanLimits(selectedPlan?.limits)}</p>
                </div>

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
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The secret step's own control — `SecretReveal`'s internal `Field.Root` + `Field.Description` +
 * `Input` + Copy wiring, inlined rather than rendered via `<SecretReveal>` itself: that component
 * is its OWN bordered floor-sitting panel (`secret-strip`, `background-color`/`border`/`padding`
 * of its own), which nested inside this dialog's already-bordered `Dialog.Popup` is exactly the
 * "card inside a card" this step exists to stop being. What survives is the accessible wiring —
 * `Field.Description` registers its id on the field, and `Field.Control` folds it into the
 * control's `describedby`, so a screen-reader user hears the "shown once" caption WITH the
 * secret — and the copy affordance (`navigator.clipboard`, a mono "Copied" acknowledgement on
 * the button itself, never a toast — ADR 0008).
 */
function SecretField({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    // Best-effort, the same contract every other clipboard write in this app follows
    // (`AccountBadge`'s own `onCopyId`): the write can genuinely fail (permission denied, an
    // insecure origin), and the secret stays focused/selected either way as the manual-copy
    // fallback, so a failure here is silent rather than an unhandled rejection — never a claimed
    // "Copied" for a copy that didn't happen.
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret);
      } else {
        return;
      }
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <BaseField.Root className="fieldset">
      <BaseField.Label className={fieldLabelClassName}>Secret</BaseField.Label>
      <div className="secret-field-row">
        <BaseInput
          readOnly
          value={secret}
          aria-label="Secret value"
          onFocus={(event) => event.target.select()}
          // The one raw `<input>` in the library that shows a DATA value in the field control's
          // clothing (phase 9 — `input`'s own mono went sans-by-default with the rest of the
          // console's controls; a secret key is data, so it opts back in here) — the exact same
          // `cn(fieldControlClassName, 'font-mono')` pattern `SecretReveal` already uses.
          className={cn(fieldControlClassName, 'font-mono')}
        />
        <Button type="button" variant="primary" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </BaseField.Root>
  );
}
