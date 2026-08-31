// Page-level acceptance story for `/settings/refill-options` — Phase G redesign (2026-08-31).
//
// Owner verdict on the previous page, verbatim: "For /settings/refill-options, I'm totally lost.
// How does it work? Where's the manual? And it's also very non-human, json-inputs..." This story
// composes the redesign: `RefillPolicyStatusStrip` (the one honestly-readable fact —
// `getBudgetPolicyStatus`'s policy set id / active revision — stated beside the real limitation on
// its content, `converse-frontends#368`), `RefillPolicyManual` (the "how does it work" explainer +
// lifecycle diagram), "Your current ladder" (the read-only echo `useBudgetRefillLadder()` already
// gave this page), and `PolicySimulator` — now composing `RuleSetForm`/`ScenarioForm` instead of
// the two JSON textareas the owner was reacting to.
//
// Storybook-only. Nothing here is exported from `src/index.ts`. `apps/console` wiring
// (`containers/use-refill-options-screen.ts`, `containers/refill-options-centre.tsx`) is
// deliberately NOT touched by this batch — screenshots go to the owner first.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { ErrorLine } from '../components/error-line';
import { InlineStatus } from '../components/inline-status';
import { SkeletonMetric } from '../components/skeleton-metric';
import { PageHeader } from '../sections/page-header';
import { PolicySimulator } from '../sections/policy-simulator';
import { policySimulatorResult } from '../sections/policy-simulator/fixtures';
import { RefillPolicyManual } from '../sections/refill-policy-manual';
import { RefillPolicyStatusStrip } from '../sections/refill-policy-status-strip';
import type { RefillPolicyStatusState } from '../sections/refill-policy-status-strip';
import { ruleSetFormEmpty, ruleSetFormErrors, ruleSetFormPopulated, ruleSetFormWithErrors } from '../sections/rule-set-form/fixtures';
import type { RuleSetErrors, RuleSetValue } from '../sections/rule-set-form';
import { scenarioFormEmpty, scenarioFormPopulated } from '../sections/refill-scenario-form/fixtures';
import type { ScenarioValue } from '../sections/refill-scenario-form';
import { storySidebar, storyTopBar } from './shell-fixtures';

type LadderState =
  | { status: 'ready'; amounts: string[] }
  | { status: 'empty'; caption: string }
  | { status: 'loading' }
  | { status: 'error'; errorMessage: string };

interface RefillOptionsScreenProps {
  statusState?: RefillPolicyStatusState;
  ladderState?: LadderState;
  manualInitiallyOpen?: boolean;
  ruleSetInitial?: RuleSetValue;
  ruleSetErrors?: RuleSetErrors;
  scenarioInitial?: ScenarioValue;
  showResult?: boolean;
  showAdmin?: boolean;
}

const READY_STATUS: RefillPolicyStatusState = {
  status: 'ready',
  policySetId: 'budget-refill',
  activeRevision: 'budget-policy-v1',
};

const READY_LADDER: LadderState = { status: 'ready', amounts: ['+$6.00', '+$15.00', '+$30.00'] };

// The composition `apps/console`'s `(console)` layout + `/settings/refill-options` route would
// perform for real, once a follow-up phase wires this design into `use-refill-options-screen.ts`.
function RefillOptionsScreen({
  statusState = READY_STATUS,
  ladderState = READY_LADDER,
  manualInitiallyOpen = false,
  ruleSetInitial = ruleSetFormPopulated,
  ruleSetErrors,
  scenarioInitial = scenarioFormPopulated,
  showResult = false,
  showAdmin = false,
}: RefillOptionsScreenProps) {
  const [manualOpen, setManualOpen] = useState(manualInitiallyOpen);
  const [ruleSet, setRuleSet] = useState(ruleSetInitial);
  const [scenario, setScenario] = useState(scenarioInitial);
  const [requestedAmount, setRequestedAmount] = useState('25.00');

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Refill options policies" subtitle="adorsys-gis" />

        <RefillPolicyStatusStrip state={statusState} />

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

        <Card>
          <PolicySimulator
            ruleSet={ruleSet}
            onRuleSetChange={setRuleSet}
            ruleSetErrors={ruleSetErrors}
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
    </ConsoleShell>
  );
}

const meta: Meta<typeof RefillOptionsScreen> = {
  title: 'Pages/RefillOptions',
  component: RefillOptionsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RefillOptionsScreen>;

export const Populated: Story = { render: () => <RefillOptionsScreen showResult /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <RefillOptionsScreen showResult />,
  globals: { theme: 'wireframe' },
};

export const ManualOpen: Story = {
  name: 'The manual, expanded',
  render: () => <RefillOptionsScreen manualInitiallyOpen />,
};

export const ManualOpenLight: Story = {
  name: 'The manual, expanded — wireframe (light)',
  render: () => <RefillOptionsScreen manualInitiallyOpen />,
  globals: { theme: 'wireframe' },
};

export const ValidationErrors: Story = {
  name: 'RuleSetForm — every field-level error at once',
  render: () => (
    <RefillOptionsScreen ruleSetInitial={ruleSetFormWithErrors} ruleSetErrors={ruleSetFormErrors} />
  ),
};

export const EmptyFirstRun: Story = {
  name: 'Empty — first-run draft, no ladder yet',
  render: () => (
    <RefillOptionsScreen
      ladderState={{
        status: 'empty',
        caption: 'The active refill policy currently offers no amount for this account.',
      }}
      ruleSetInitial={ruleSetFormEmpty}
      scenarioInitial={scenarioFormEmpty}
      statusState={{
        status: 'unavailable',
        caption:
          'No known policy set id to check yet — there is no discovery procedure for one today (converse-frontends#368).',
      }}
    />
  ),
};

export const StatusLoading: Story = {
  name: 'Status strip — loading',
  render: () => <RefillOptionsScreen statusState={{ status: 'loading' }} />,
};

export const StatusError: Story = {
  name: 'Status strip — error',
  render: () => (
    <RefillOptionsScreen
      statusState={{ status: 'error', errorMessage: 'Could not load the active policy status.' }}
    />
  ),
};

export const AdminNav: Story = {
  name: 'Nav — admin (Operator group visible)',
  render: () => <RefillOptionsScreen showAdmin />,
};

export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <RefillOptionsScreen showResult />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <RefillOptionsScreen />,
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <RefillOptionsScreen />,
};
