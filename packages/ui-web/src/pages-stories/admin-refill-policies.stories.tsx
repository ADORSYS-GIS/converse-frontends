// Page-level acceptance story for `/admin/refill-policies` — moved off `/settings/refill-options`
// (owner ruling, verbatim: "Refill options are for admins only. Not normal users. And we don't
// 'Simulate' them on the same page where we create them. /admin/refill-policies should be for
// listing them /admin/refill-policies?create=true or /admin/refill-policies?edit=<id> to create or
// edit, respectively, /admin/refill-policies?simulate=<id> to simulate." — converse-frontends#368).
//
// **Two views now, one per real mode on THIS route, never composed together** (owner review round
// 2, 2026-08-31, converse-frontends#368 finding #4, verbatim: "You made out of
// /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But it's
// fine. Just move it to a page /admin/refill-policies/create" — CREATE moved to its own page story,
// `admin-refill-policies-create.stories.tsx`, mirroring the real route split):
//  - LIST — `RefillPolicyLookup` (the honest "which policy set do I look at" zone — there is no
//    procedure that lists which policy sets exist), "Your current ladder", and the
//    `RefillPolicyManual` explainer. Its own "+ New policy" action is a plain link to
//    `/admin/refill-policies/create` now, not a mode switch.
//  - EDIT — the identical form CREATE uses, honestly labelled "author a replacement revision for
//    <id>", with the no-read-API caption stated inline rather than a fake prefill.
//  - SIMULATE — `PolicySimulator` (rule set + scenario + decision readout), never rendered
//    alongside edit.
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
import { ruleSetFormPopulated } from '../sections/rule-set-form/fixtures';
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

type Mode = 'list' | 'edit' | 'simulate';

interface AdminRefillPoliciesScreenProps {
  mode?: Mode;
  lookupValue?: string;
  status?: RefillPolicyStatusState;
  ladderState?: LadderState;
  manualInitiallyOpen?: boolean;
  formPolicySetId?: string;
  formRuleSetInitial?: RuleSetValue;
  formRuleSetErrors?: RuleSetErrors;
  showResult?: boolean;
  showAdmin?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `admin-refill-policies-centre.tsx` would
// perform for real — one function per mode, the top level renders exactly one. `create` moved to
// its own page story (`admin-refill-policies-create.stories.tsx`) — this component only models
// what `/admin/refill-policies` itself still renders (owner review round 2, finding #4, above).
function AdminRefillPoliciesScreen({
  mode = 'list',
  lookupValue = 'budget-refill',
  status = READY_STATUS,
  ladderState = READY_LADDER,
  manualInitiallyOpen = false,
  formPolicySetId = 'budget-refill',
  formRuleSetInitial = ruleSetFormPopulated,
  formRuleSetErrors,
  showResult = false,
  showAdmin = true,
}: AdminRefillPoliciesScreenProps) {
  const [lookup, setLookup] = useState(lookupValue);
  const [manualOpen, setManualOpen] = useState(manualInitiallyOpen);
  const [ruleSet, setRuleSet] = useState(formRuleSetInitial);
  const [simulateRuleSet, setSimulateRuleSet] = useState<RuleSetValue>(createBlankRuleSet());
  const [scenario, setScenario] = useState<ScenarioValue>(scenarioFormPopulated);
  const [requestedAmount, setRequestedAmount] = useState('25.00');

  const body = (() => {
    if (mode === 'edit') {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            title={`Author a replacement revision for ${formPolicySetId}`}
            action={
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            }
          />

          <InlineStatus>{EDIT_NO_PREFILL_NOTE}</InlineStatus>

          <Card>
            <Field
              label="Policy set id"
              value={formPolicySetId}
              onChange={() => {}}
              disabled
              containerClassName="max-w-xs"
            />

            <RuleSetForm
              value={ruleSet}
              onChange={setRuleSet}
              errors={formRuleSetErrors}
              className="mt-6"
            />

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
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin })} topBar={storyTopBar()}>
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
