'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ConfirmDialog } from '@lightbridge/ui-web/src/components/confirm-dialog';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { PolicySimulator } from '@lightbridge/ui-web/src/sections/policy-simulator';
import { RefillPolicyLookup } from '@lightbridge/ui-web/src/sections/refill-policy-lookup';
import { RefillPolicyManual } from '@lightbridge/ui-web/src/sections/refill-policy-manual';
import { RuleSetForm, ruleSetFieldExample } from '@lightbridge/ui-web/src/sections/rule-set-form';
import Link from 'next/link';

import type { AdminRefillPoliciesFormScreen } from './use-refill-policies-screen';
import { useRefillPoliciesScreen } from './use-refill-policies-screen';

const EDIT_NO_PREFILL_NOTE =
  'This starts from a blank draft, not a copy of the current revision — there is no read API ' +
  'for stored rule content today (converse-frontends#368).';

const EXAMPLE_OVERWRITE_TITLE = 'Replace this draft with the example policy?';
const EXAMPLE_OVERWRITE_BODY =
  'The example policy overwrites every field on this form, the policy set id included. Nothing ' +
  'you have typed here has been saved yet, so it cannot be recovered afterwards.';

/**
 * `/admin/refill-policies` — admin-only (owner ruling, verbatim: "Refill options are for admins
 * only. Not normal users."), mode-split by nuqs params (`?edit=<id>`/`?simulate=<id>`, never
 * composed together — see `use-refill-policies-screen.ts`'s own doc comment for the full ruling
 * and the write paths each mode wires). **`create` is no longer one of this dispatcher's modes**
 * (owner review round 2, 2026-08-31, converse-frontends#368 finding #4) — it moved to its own
 * route, `/admin/refill-policies/create` (`admin-refill-policy-create-centre.tsx`), which reuses
 * `RefillPolicyFormView` below (exported for exactly that reuse) fed by its own sibling hook,
 * `use-refill-policy-create-screen.ts`.
 */
export function AdminRefillPoliciesCentre() {
  const screen = useRefillPoliciesScreen();

  if (screen.mode === 'edit') {
    return <RefillPolicyFormView form={screen.form} />;
  }
  if (screen.mode === 'simulate') {
    return <RefillPolicySimulateView screen={screen} />;
  }
  return <RefillPolicyListView screen={screen} />;
}

function RefillPolicyListView({ screen }: { screen: ReturnType<typeof useRefillPoliciesScreen> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Refill policies"
        subtitle={screen.scopeLabel}
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/refill-policies/create" />}>
            + New policy
          </Button>
        }
      />

      <Card>
        <RefillPolicyLookup
          value={screen.list.policySetId}
          onChange={screen.list.onPolicySetIdChange}
          status={screen.list.status}
          onEditRevision={screen.list.onEditRevision}
          onSimulate={screen.list.onSimulate}
        />
      </Card>

      <Card title="Your current ladder">
        {screen.list.ladder.status === 'loading' ? (
          <SkeletonMetric width={160} />
        ) : screen.list.ladder.status === 'error' ? (
          <ErrorLine
            message={screen.list.ladder.errorMessage ?? 'Could not load the refill policy.'}
            onRetry={screen.list.ladder.onRetry}
          />
        ) : screen.list.ladder.status === 'unavailable' || screen.list.ladder.status === 'empty' ? (
          <InlineStatus>{screen.list.ladder.caption}</InlineStatus>
        ) : (
          <p className="text-ink font-mono text-[13px]">{screen.list.ladder.amounts.join(' · ')}</p>
        )}
      </Card>

      <Card>
        <RefillPolicyManual
          open={screen.list.manualOpen}
          onOpenChange={screen.list.onManualOpenChange}
        />
      </Card>
    </div>
  );
}

/**
 * The create/edit form — shared by TWO different routes now (owner review round 2, 2026-08-31,
 * converse-frontends#368 finding #4): `/admin/refill-policies`'s own `edit` mode
 * (`AdminRefillPoliciesCentre` above, fed by `useRefillPoliciesScreen().form`) and the standalone
 * `/admin/refill-policies/create` route (`admin-refill-policy-create-centre.tsx`, fed by
 * `useRefillPolicyCreateScreen()`) — hence taking `form` directly rather than the whole
 * mode-dispatch `AdminRefillPoliciesScreen`, which only the list route's own hook produces.
 * Exported for that second caller.
 */
export function RefillPolicyFormView({ form }: { form: AdminRefillPoliciesFormScreen }) {
  const title =
    form.mode === 'edit'
      ? `Author a replacement revision for ${form.policySetId}`
      : 'New refill policy';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={
          form.mode === 'edit'
            ? undefined
            : 'Author a brand-new policy set from scratch — or start from the example and edit it.'
        }
        controls={
          // Create-only, by construction: `startFromExample` only exists on
          // `useRefillPolicyCreateScreen`'s return value. The edit route authors a replacement
          // revision for a policy set that already exists and has no business offering a sample.
          form.startFromExample ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={form.startFromExample.onStart}>
              Start from example policy
            </Button>
          ) : null
        }
        action={
          <Button type="button" variant="ghost" size="sm" onClick={form.onCancel}>
            Cancel
          </Button>
        }
      />

      {form.startFromExample ? (
        <ConfirmDialog
          open={form.startFromExample.confirmOpen}
          title={EXAMPLE_OVERWRITE_TITLE}
          description={EXAMPLE_OVERWRITE_BODY}
          confirmLabel="Replace my draft"
          onConfirm={form.startFromExample.onConfirm}
          onCancel={form.startFromExample.onCancelConfirm}
        />
      ) : null}

      {form.mode === 'edit' ? <InlineStatus>{EDIT_NO_PREFILL_NOTE}</InlineStatus> : null}

      <Card>
        <Field
          label="Policy set id"
          example={ruleSetFieldExample('policySetId')}
          value={form.policySetId}
          onChange={(event) => form.onPolicySetIdChange?.(event.target.value)}
          disabled={form.policySetIdReadOnly}
          containerClassName="max-w-xs"
        />

        <RuleSetForm
          value={form.ruleSet}
          onChange={form.onRuleSetChange}
          errors={form.ruleSetErrors}
          className="mt-6"
        />

        {form.activateError ? <ErrorLine message={form.activateError} className="mt-4" /> : null}
        {form.saveRevisionError ? (
          <ErrorLine message={form.saveRevisionError} className="mt-4" />
        ) : null}
        {form.savedRevision ? (
          <InlineStatus className="mt-4">
            {`Revision ${form.savedRevision.revisionId} created (policy revision "${form.savedRevision.policyRevision}") — not yet active.`}
          </InlineStatus>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={!form.canSubmit}
            onClick={form.onActivate}>
            {form.activating ? 'Activating…' : 'Create & activate'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!form.canSubmit}
            onClick={form.onSaveRevisionOnly}>
            {form.savingRevision ? 'Saving…' : 'Save as revision only'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RefillPolicySimulateView({
  screen,
}: {
  screen: ReturnType<typeof useRefillPoliciesScreen>;
}) {
  const { simulate } = screen;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Simulate against ${simulate.policySetId}`}
        subtitle="Nothing here reads or changes this policy's actual, active revision."
        action={
          <Button type="button" variant="ghost" size="sm" onClick={simulate.onBack}>
            Back to list
          </Button>
        }
      />

      <Card>
        <PolicySimulator
          ruleSet={simulate.ruleSet}
          onRuleSetChange={simulate.onRuleSetChange}
          ruleSetErrors={simulate.ruleSetErrors}
          scenario={simulate.scenario}
          onScenarioChange={simulate.onScenarioChange}
          scenarioErrors={simulate.scenarioErrors}
          requestedAmount={simulate.requestedAmount}
          onRequestedAmountChange={simulate.onRequestedAmountChange}
          submitting={simulate.submitting}
          error={simulate.error}
          canSubmit={simulate.canSubmit}
          onSubmit={simulate.onSubmit}
          result={simulate.result}
        />
      </Card>
    </div>
  );
}
