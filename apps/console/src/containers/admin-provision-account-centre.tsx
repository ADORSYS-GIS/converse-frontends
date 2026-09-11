'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../i18n/client';
import {
  useProvisionAccountScreen,
  type ProvisionAccountScreen,
} from './use-provision-account-screen';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722) — the offboarding kill switch's mirror
 * image at onboarding time: an admin creates a first account for a Keycloak subject who cannot
 * self-provision one. No existing form view to reuse here (unlike `/admin/refill-policies/create`,
 * which shares `RefillPolicyFormView` with its list route) — this is the first console screen
 * where an admin types an arbitrary target subject rather than acting on the caller's own
 * identity, so the view is defined inline rather than forced into an unrelated shared component.
 *
 * Every user-visible string goes through the `admin` namespace (ADR 0017) — the same rule every
 * other admin screen carries; nothing here is hard-coded English.
 */
export function AdminProvisionAccountCentre() {
  const form = useProvisionAccountScreen();
  return <ProvisionAccountFormView form={form} />;
}

function ProvisionAccountFormView({ form }: { form: ProvisionAccountScreen }) {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('provision-account.title')} subtitle={t('provision-account.subtitle')} />

      <Card>
        <Field
          label={t('provision-account.subject-label')}
          placeholder={t('provision-account.subject-placeholder')}
          value={form.subject}
          onChange={(event) => form.onSubjectChange(event.target.value)}
          error={form.subjectError}
          autoComplete="off"
          containerClassName="max-w-md"
        />

        <Field
          label={t('provision-account.email-label')}
          placeholder={t('provision-account.email-placeholder')}
          value={form.email}
          onChange={(event) => form.onEmailChange(event.target.value)}
          error={form.emailError}
          autoComplete="off"
          containerClassName="mt-6 max-w-md"
        />
        <p className="text-muted-foreground mt-1 text-sm">{t('provision-account.email-note')}</p>

        <Field
          label={t('provision-account.name-label')}
          placeholder={t('provision-account.name-placeholder')}
          value={form.name}
          onChange={(event) => form.onNameChange(event.target.value)}
          autoComplete="off"
          containerClassName="mt-6 max-w-md"
        />

        {form.error ? <ErrorLine message={form.error} className="mt-4" /> : null}
        {form.result ? (
          <InlineStatus className="mt-4">
            {t('provision-account.provisioned', { accountId: form.result.accountId })}
          </InlineStatus>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={!form.canSubmit}
            onClick={form.onProvision}>
            {form.submitting ? t('provision-account.submitting') : t('provision-account.submit')}
          </Button>
          {form.result ? (
            <Button type="button" variant="secondary" onClick={form.onProvisionAnother}>
              {t('provision-account.another')}
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
