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
import { ConsoleShell } from '../components/console-shell';
import { Field } from '../components/field';
import { InlineStatus } from '../components/inline-status';
import { PageHeader } from '../sections/page-header';
import { RuleSetForm } from '../sections/rule-set-form';
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
}

// The composition `apps/console`'s `(console)` layout + `admin-refill-policy-create-centre.tsx`
// would perform for real.
function AdminRefillPolicyCreateScreen({
  formRuleSetInitial = ruleSetFormPopulated,
  formRuleSetErrors,
  savedRevision,
  showAdmin = true,
}: AdminRefillPolicyCreateScreenProps) {
  const [policySetIdDraft, setPolicySetIdDraft] = useState('new-policy-set');
  const [ruleSet, setRuleSet] = useState(formRuleSetInitial);

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="New refill policy"
          subtitle="Author a brand-new policy set from scratch."
          action={
            <Button type="button" variant="ghost" size="sm">
              Cancel
            </Button>
          }
        />

        <Card>
          <Field
            label="Policy set id"
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
  title: 'Pages/AdminRefillPoliciesCreate',
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
