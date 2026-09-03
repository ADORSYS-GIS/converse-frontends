// Page-level acceptance story for `/admin/refill-policies/create` — owner review round 2
// (2026-08-31, converse-frontends#368 finding #4, verbatim): "You made out of
// /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But it's
// fine. Just move it to a page /admin/refill-policies/create." Split off
// `admin-refill-policies.stories.tsx`'s own former `create` mode, mirroring the real route split
// (`admin-refill-policy-create-centre.tsx`, reusing the SAME `RefillPolicyFormView`
// `/admin/refill-policies`'s own `edit` mode renders — see that file's own doc comment).
//
// One view — `RuleSetForm` authoring a brand-new policy set, with BOTH real write actions wired
// in the real container (`activateBudgetPolicy`/`createBudgetPolicyRevision`).
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConfirmDialog } from '../components/confirm-dialog';
import { ConsoleShell } from '../components/console-shell';
import { Field } from '../components/field';
import { InlineStatus } from '../components/inline-status';
import { PageControls } from '../sections/page-controls';
import { PageHeader } from '../sections/page-header';
import {
  createExampleRuleSet,
  EXAMPLE_POLICY_SET_ID,
  RuleSetForm,
  ruleSetFieldExample,
} from '../sections/rule-set-form';
import {
  ruleSetFormErrors,
  ruleSetFormPopulated,
  ruleSetFormWithErrors,
} from '../sections/rule-set-form/fixtures';
import type { RuleSetErrors, RuleSetValue } from '../sections/rule-set-form';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface AdminRefillPolicyCreateScreenProps {
  formRuleSetInitial?: RuleSetValue;
  formRuleSetErrors?: RuleSetErrors;
  savedRevision?: { revisionId: string; policyRevision: string };
  showAdmin?: boolean;
  /** Fixtures the initial policy set id — the example state fills it the way the real button does. */
  policySetIdInitial?: string;
  /** Fixtures the overwrite gate open, the state a dirty draft lands in (issue #445). */
  overwriteConfirmOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `admin-refill-policy-create-centre.tsx`
// would perform for real.
function AdminRefillPolicyCreateScreen({
  formRuleSetInitial = ruleSetFormPopulated,
  formRuleSetErrors,
  savedRevision,
  showAdmin = true,
  policySetIdInitial = 'new-policy-set',
  overwriteConfirmOpen = false,
}: AdminRefillPolicyCreateScreenProps) {
  const [policySetIdDraft, setPolicySetIdDraft] = useState(policySetIdInitial);
  const [ruleSet, setRuleSet] = useState(formRuleSetInitial);
  const [confirmOpen, setConfirmOpen] = useState(overwriteConfirmOpen);

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="New refill policy"
          subtitle="Author a brand-new policy set from scratch — or start from the example and edit it."
          action={
            <Button type="button" variant="ghost" size="sm">
              Cancel
            </Button>
          }
        />

        <PageControls
          groups={[
            {
              id: 'controls',
              label: 'Filters',
              children: (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}>
                  Start from example policy
                </Button>
              ),
            },
          ]}
        />

        <ConfirmDialog
          open={confirmOpen}
          title="Replace this draft with the example policy?"
          description="The example policy overwrites every field on this form, the policy set id included. Nothing you have typed here has been saved yet, so it cannot be recovered afterwards."
          confirmLabel="Replace my draft"
          onConfirm={() => {
            setPolicySetIdDraft(EXAMPLE_POLICY_SET_ID);
            setRuleSet(createExampleRuleSet());
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />

        <Card>
          <Field
            label="Policy set id"
            example={ruleSetFieldExample('policySetId')}
            value={policySetIdDraft}
            onChange={(event) => setPolicySetIdDraft(event.target.value)}
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
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminRefillPolicyCreateScreen> = {
  title: 'Pages/Admin/RefillPolicyCreate',
  component: AdminRefillPolicyCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminRefillPolicyCreateScreen>;

export const Create: Story = { render: () => <AdminRefillPolicyCreateScreen /> };

export const CreateLight: Story = {
  name: 'Create — wireframe (light)',
  render: () => <AdminRefillPolicyCreateScreen />,
  globals: { theme: 'wireframe' },
};

export const ValidationErrors: Story = {
  name: 'Create — every field-level error at once',
  render: () => (
    <AdminRefillPolicyCreateScreen
      formRuleSetInitial={ruleSetFormWithErrors}
      formRuleSetErrors={ruleSetFormErrors}
    />
  ),
};

export const SavedRevisionOnly: Story = {
  name: 'Create — "Save as revision only" succeeded, not yet active',
  render: () => (
    <AdminRefillPolicyCreateScreen
      savedRevision={{ revisionId: 'rev_9f2c', policyRevision: 'budget-policy-v2' }}
    />
  ),
};

export const Mobile: Story = {
  name: 'Create — mobile',
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminRefillPolicyCreateScreen />,
};

// Issue #445 — the two states the "Start from example policy" affordance adds to this route.
export const AfterStartFromExample: Story = {
  name: 'Create — after "Start from example policy"',
  render: () => (
    <AdminRefillPolicyCreateScreen
      policySetIdInitial={EXAMPLE_POLICY_SET_ID}
      formRuleSetInitial={createExampleRuleSet()}
    />
  ),
};

export const AfterStartFromExampleLight: Story = {
  name: 'Create — after "Start from example policy", wireframe (light)',
  render: () => (
    <AdminRefillPolicyCreateScreen
      policySetIdInitial={EXAMPLE_POLICY_SET_ID}
      formRuleSetInitial={createExampleRuleSet()}
    />
  ),
  globals: { theme: 'wireframe' },
};

export const OverwriteConfirmation: Story = {
  name: 'Create — the overwrite gate on a draft that was already typed into',
  render: () => <AdminRefillPolicyCreateScreen overwriteConfirmOpen />,
};

export const OverwriteConfirmationLight: Story = {
  name: 'Create — the overwrite gate, wireframe (light)',
  render: () => <AdminRefillPolicyCreateScreen overwriteConfirmOpen />,
  globals: { theme: 'wireframe' },
};
