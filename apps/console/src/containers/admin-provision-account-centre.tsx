'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useProvisionAccountScreen, type ProvisionAccountScreen } from './use-provision-account-screen';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722) — the offboarding kill switch's mirror
 * image at onboarding time: an admin creates a first account for a Keycloak subject who cannot
 * self-provision one. No existing form view to reuse here (unlike `/admin/refill-policies/create`,
 * which shares `RefillPolicyFormView` with its list route) — this is the first console screen
 * where an admin types an arbitrary target subject rather than acting on the caller's own
 * identity, so the view is defined inline rather than forced into an unrelated shared component.
 */
export function AdminProvisionAccountCentre() {
  const form = useProvisionAccountScreen();
  return <ProvisionAccountFormView form={form} />;
}

function ProvisionAccountFormView({ form }: { form: ProvisionAccountScreen }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Provision account"
        subtitle="Create a first account for a Keycloak subject who has no self-service path to one."
      />

      <Card>
        <Field
          label="Keycloak subject"
          placeholder="the subject's JWT sub"
          value={form.subject}
          onChange={(event) => form.onSubjectChange(event.target.value)}
          error={form.subjectError}
          autoComplete="off"
          containerClassName="max-w-md"
        />

        <Field
          label="Email"
          placeholder="person@example.com"
          value={form.email}
          onChange={(event) => form.onEmailChange(event.target.value)}
          error={form.emailError}
          autoComplete="off"
          containerClassName="mt-6 max-w-md"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Becomes the billing identity of the account&apos;s default project — must be unique
          across every project.
        </p>

        <Field
          label="Display name"
          placeholder="optional"
          value={form.name}
          onChange={(event) => form.onNameChange(event.target.value)}
          autoComplete="off"
          containerClassName="mt-6 max-w-md"
        />

        {form.error ? <ErrorLine message={form.error} className="mt-4" /> : null}
        {form.result ? (
          <InlineStatus className="mt-4">
            {`Account ${form.result.accountId} provisioned. They can now sign in.`}
          </InlineStatus>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="primary" disabled={!form.canSubmit} onClick={form.onProvision}>
            {form.submitting ? 'Provisioning…' : 'Provision account'}
          </Button>
          {form.result ? (
            <Button type="button" variant="secondary" onClick={form.onProvisionAnother}>
              Provision another
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
