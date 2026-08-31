// Page-level acceptance story for `/admin/refill-policies` — moved off `/settings/refill-options`
// and split into three URL modes (owner ruling, verbatim: "Refill options are for admins only.
// Not normal users. And we don't 'Simulate' them on the same page where we create them.
// /admin/refill-policies should be for listing them /admin/refill-policies?create=true or
// /admin/refill-policies?edit=<id> to create or edit, respectively,
// /admin/refill-policies?simulate=<id> to simulate." — converse-frontends#368).
//
// Four views, one per real mode, never composed together:
//  - LIST — `RefillPolicyLookup` (the honest "which policy set do I look at" zone — there is no
//    procedure that lists which policy sets exist), "Your current ladder", and the
//    `RefillPolicyManual` explainer.
//  - CREATE — `RuleSetForm` authoring a brand-new policy set, with BOTH real write actions wired
//    (`activateBudgetPolicy`/`createBudgetPolicyRevision` in the real container).
//  - EDIT — the identical form, honestly labelled "author a replacement revision for <id>", with
//    the no-read-API caption stated inline rather than a fake prefill.
//  - SIMULATE — `PolicySimulator` (rule set + scenario + decision readout), never rendered
//    alongside create/edit.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { ErrorLine } from '../components/error-line';
import { Field } from '../components/field';
import { InlineStatus } from '../components/inline-status';
import { SkeletonMetric } from '../components/skeleton-metric';
import { PageHeader } from '../sections/page-header';
import { PolicySimulator } from '../sections/policy-simulator';
import { policySimulatorResult } from '../sections/policy-simulator/fixtures';
import { RefillPolicyLookup } from '../sections/refill-policy-lookup';
import { RefillPolicyManual } from '../sections/refill-policy-manual';
import { NO_POLICY_SET_ID_CAPTION } from '../sections/refill-policy-status-strip';
import type { RefillPolicyStatusState } from '../sections/refill-policy-status-strip';
import { createBlankRuleSet, RuleSetForm } from '../sections/rule-set-form';
import {
  ruleSetFormErrors,
  ruleSetFormPopulated,
  ruleSetFormWithErrors,
} from '../sections/rule-set-form/fixtures';
import type { RuleSetErrors, RuleSetValue } from '../sections/rule-set-form';
import { createBlankScenario } from '../sections/refill-scenario-form';
import { scenarioFormPopulated } from '../sections/refill-scenario-form/fixtures';
import type { ScenarioValue } from '../sections/refill-scenario-form';
import { storySidebar, storyTopBar } from './shell-fixtures';

type LadderState =
  | { status: 'ready'; amounts: string[] }
  | { status: 'empty'; caption: string }
  | { status: 'loading' }
  | { status: 'error'; errorMessage: string };

const READY_LADDER: LadderState = { status: 'ready', amounts: ['+$6.00', '+$15.00', '+$30.00'] };

const READY_STATUS: RefillPolicyStatusState = {
  status: 'ready',
  policySetId: 'budget-refill',
  activeRevision: 'budget-policy-v1',
};

const UNAVAILABLE_STATUS: RefillPolicyStatusState = {
  status: 'unavailable',
  caption: NO_POLICY_SET_ID_CAPTION,
};

const EDIT_NO_PREFILL_NOTE =
  'This starts from a blank draft, not a copy of the current revision — there is no read API ' +
  'for stored rule content today (converse-frontends#368).';

type Mode = 'list' | 'create' | 'edit' | 'simulate';

interface AdminRefillPoliciesScreenProps {
  mode?: Mode;
  lookupValue?: string;
  status?: RefillPolicyStatusState;
  ladderState?: LadderState;
  manualInitiallyOpen?: boolean;
  formPolicySetId?: string;
  formRuleSetInitial?: RuleSetValue;
  formRuleSetErrors?: RuleSetErrors;
  savedRevision?: { revisionId: string; policyRevision: string };
  showResult?: boolean;
  showAdmin?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `admin-refill-policies-centre.tsx` would
// perform for real — one function per mode, the top level renders exactly one.
function AdminRefillPoliciesScreen({
  mode = 'list',
  lookupValue = 'budget-refill',
  status = READY_STATUS,
  ladderState = READY_LADDER,
  manualInitiallyOpen = false,
  formPolicySetId = 'new-policy-set',
  formRuleSetInitial = ruleSetFormPopulated,
  formRuleSetErrors,
  savedRevision,
  showResult = false,
  showAdmin = true,
}: AdminRefillPoliciesScreenProps) {
  const [lookup, setLookup] = useState(lookupValue);
  const [manualOpen, setManualOpen] = useState(manualInitiallyOpen);
  const [formPolicySetIdDraft, setFormPolicySetIdDraft] = useState(formPolicySetId);
  const [ruleSet, setRuleSet] = useState(formRuleSetInitial);
  const [simulateRuleSet, setSimulateRuleSet] = useState<RuleSetValue>(createBlankRuleSet());
  const [scenario, setScenario] = useState<ScenarioValue>(scenarioFormPopulated);
  const [requestedAmount, setRequestedAmount] = useState('25.00');

  const body = (() => {
    if (mode === 'create' || mode === 'edit') {
      const title =
        mode === 'edit'
          ? `Author a replacement revision for ${formPolicySetId}`
          : 'New refill policy';
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            title={title}
            subtitle={mode === 'edit' ? undefined : 'Author a brand-new policy set from scratch.'}
            action={
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            }
          />

          {mode === 'edit' ? <InlineStatus>{EDIT_NO_PREFILL_NOTE}</InlineStatus> : null}

          <Card>
            <Field
              label="Policy set id"
              value={mode === 'edit' ? formPolicySetId : formPolicySetIdDraft}
              onChange={(event) => setFormPolicySetIdDraft(event.target.value)}
              disabled={mode === 'edit'}
              containerClassName="max-w-xs"
            />

            <RuleSetForm
              value={ruleSet}
              onChange={setRuleSet}
              errors={formRuleSetErrors}
              className="mt-6"
            />

            {savedRevision ? (
              <InlineStatus className="mt-4">
                {`Revision ${savedRevision.revisionId} created (policy revision "${savedRevision.policyRevision}") — not yet active.`}
              </InlineStatus>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="primary">
                Create & activate
              </Button>
              <Button type="button" variant="secondary">
                Save as revision only
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (mode === 'simulate') {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            title={`Simulate against ${lookupValue}`}
            subtitle="Nothing here reads or changes this policy's actual, active revision."
            action={
              <Button type="button" variant="ghost" size="sm">
                Back to list
              </Button>
            }
          />
          <Card>
            <PolicySimulator
              ruleSet={simulateRuleSet}
              onRuleSetChange={setSimulateRuleSet}
              scenario={scenario}
              onScenarioChange={setScenario}
              requestedAmount={requestedAmount}
              onRequestedAmountChange={setRequestedAmount}
              submitting={false}
              canSubmit
              onSubmit={() => {}}
              result={showResult ? policySimulatorResult.result : undefined}
            />
          </Card>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Refill policies"
          subtitle="adorsys-gis"
          action={
            <Button type="button" variant="primary" size="sm">
              + New policy
            </Button>
          }
        />

        <Card>
          <RefillPolicyLookup
            value={lookup}
            onChange={setLookup}
            status={status}
            onEditRevision={status.status === 'ready' ? () => {} : undefined}
            onSimulate={status.status === 'ready' ? () => {} : undefined}
          />
        </Card>

        <Card title="Your current ladder">
          {ladderState.status === 'loading' ? (
            <SkeletonMetric width={160} />
          ) : ladderState.status === 'error' ? (
            <ErrorLine message={ladderState.errorMessage} />
          ) : ladderState.status === 'empty' ? (
            <InlineStatus>{ladderState.caption}</InlineStatus>
          ) : (
            <p className="text-ink font-mono text-[13px]">{ladderState.amounts.join(' · ')}</p>
          )}
        </Card>

        <Card>
          <RefillPolicyManual open={manualOpen} onOpenChange={setManualOpen} />
        </Card>
      </div>
    );
  })();

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      {body}
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminRefillPoliciesScreen> = {
  title: 'Pages/AdminRefillPolicies',
  component: AdminRefillPoliciesScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminRefillPoliciesScreen>;

export const List: Story = { render: () => <AdminRefillPoliciesScreen /> };

export const ListLight: Story = {
  name: 'List — wireframe (light)',
  render: () => <AdminRefillPoliciesScreen />,
  globals: { theme: 'wireframe' },
};

export const ListNoLookupYet: Story = {
  name: 'List — no lookup yet (the honest default)',
  render: () => <AdminRefillPoliciesScreen lookupValue="" status={UNAVAILABLE_STATUS} />,
};

export const ListManualOpen: Story = {
  name: 'List — the manual, expanded',
  render: () => <AdminRefillPoliciesScreen manualInitiallyOpen />,
};

export const ListMobile: Story = {
  name: 'List — mobile',
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminRefillPoliciesScreen />,
};

export const Create: Story = { render: () => <AdminRefillPoliciesScreen mode="create" /> };

export const CreateLight: Story = {
  name: 'Create — wireframe (light)',
  render: () => <AdminRefillPoliciesScreen mode="create" />,
  globals: { theme: 'wireframe' },
};

export const CreateValidationErrors: Story = {
  name: 'Create — every field-level error at once',
  render: () => (
    <AdminRefillPoliciesScreen
      mode="create"
      formRuleSetInitial={ruleSetFormWithErrors}
      formRuleSetErrors={ruleSetFormErrors}
    />
  ),
};

export const CreateSavedRevisionOnly: Story = {
  name: 'Create — "Save as revision only" succeeded, not yet active',
  render: () => (
    <AdminRefillPoliciesScreen
      mode="create"
      savedRevision={{ revisionId: 'rev_9f2c', policyRevision: 'budget-policy-v2' }}
    />
  ),
};

export const EditHonest: Story = {
  name: 'Edit — honest "no prefill" caption',
  render: () => <AdminRefillPoliciesScreen mode="edit" formPolicySetId="budget-refill" />,
};

export const EditHonestLight: Story = {
  name: 'Edit — honest, wireframe (light)',
  render: () => <AdminRefillPoliciesScreen mode="edit" formPolicySetId="budget-refill" />,
  globals: { theme: 'wireframe' },
};

export const Simulate: Story = {
  render: () => <AdminRefillPoliciesScreen mode="simulate" showResult />,
};

export const SimulateLight: Story = {
  name: 'Simulate — wireframe (light)',
  render: () => <AdminRefillPoliciesScreen mode="simulate" showResult />,
  globals: { theme: 'wireframe' },
};

export const SimulateMobile: Story = {
  name: 'Simulate — mobile',
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminRefillPoliciesScreen mode="simulate" />,
};
