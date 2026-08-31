'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { PolicySimulator } from '@lightbridge/ui-web/src/sections/policy-simulator';
import { RefillPolicyLookup } from '@lightbridge/ui-web/src/sections/refill-policy-lookup';
import { RefillPolicyManual } from '@lightbridge/ui-web/src/sections/refill-policy-manual';
import { RuleSetForm } from '@lightbridge/ui-web/src/sections/rule-set-form';

import { useRefillPoliciesScreen } from './use-refill-policies-screen';

const EDIT_NO_PREFILL_NOTE =
  'This starts from a blank draft, not a copy of the current revision — there is no read API ' +
  'for stored rule content today (converse-frontends#368).';

/**
 * `/admin/refill-policies` — admin-only (owner ruling, verbatim: "Refill options are for admins
 * only. Not normal users."), mode-split by nuqs params (`?create=true`/`?edit=<id>`/
 * `?simulate=<id>`, never composed together — see `use-refill-policies-screen.ts`'s own doc
 * comment for the full ruling and the write paths each mode wires).
 */
export function AdminRefillPoliciesCentre() {
  const screen = useRefillPoliciesScreen();

  if (screen.mode === 'create' || screen.mode === 'edit') {
    return <RefillPolicyFormView screen={screen} />;
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
          <Button type="button" variant="primary" size="sm" onClick={screen.onNewPolicy}>
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

function RefillPolicyFormView({ screen }: { screen: ReturnType<typeof useRefillPoliciesScreen> }) {
  const { form } = screen;
  const title =
    form.mode === 'edit'
      ? `Author a replacement revision for ${form.policySetId}`
      : 'New refill policy';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={form.mode === 'edit' ? undefined : 'Author a brand-new policy set from scratch.'}
        action={
          <Button type="button" variant="ghost" size="sm" onClick={form.onCancel}>
            Cancel
          </Button>
        }
      />

      {form.mode === 'edit' ? <InlineStatus>{EDIT_NO_PREFILL_NOTE}</InlineStatus> : null}

      <Card>
        <Field
          label="Policy set id"
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
