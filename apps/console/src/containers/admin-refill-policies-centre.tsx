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

import { useTranslation } from '../i18n/client';
import type { AdminRefillPoliciesFormScreen } from './use-refill-policies-screen';
import { useRefillPoliciesScreen } from './use-refill-policies-screen';

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
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('refill-policies.title')}
        subtitle={screen.scopeLabel}
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/refill-policies/create" />}>
            {t('refill-policies.new-policy')}
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

      <Card title={t('refill-policies.ladder-title')}>
        {screen.list.ladder.status === 'loading' ? (
          <SkeletonMetric width={160} />
        ) : screen.list.ladder.status === 'error' ? (
          <ErrorLine
            message={screen.list.ladder.errorMessage ?? t('refill-policies.ladder-load-failed')}
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
  const { t } = useTranslation('admin');
  const title =
    form.mode === 'edit'
      ? t('refill-policies.edit.title', { policySetId: form.policySetId })
      : t('refill-policies.create.title');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={form.mode === 'edit' ? undefined : t('refill-policies.create.subtitle')}
        // Both of these are ACTIONS on the form, not screen parameters, so they stay on the title
        // row rather than moving to `PageControls` with the console's filters (ADR 0015 amendment
        // A2): this route is an authoring form and has nothing to filter. `PageHeader.action`
        // takes a cluster, and `page-header-action` lays it out as one.
        action={
          <>
            {/* Create-only, by construction: `startFromExample` only exists on
                `useRefillPolicyCreateScreen`'s return value. The edit route authors a replacement
                revision for a policy set that already exists and has no business offering a
                sample. */}
            {form.startFromExample ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={form.startFromExample.onStart}>
                {t('refill-policies.create.start-from-example')}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={form.onCancel}>
              {t('refill-policies.form.cancel')}
            </Button>
          </>
        }
      />

      {form.startFromExample ? (
        <ConfirmDialog
          open={form.startFromExample.confirmOpen}
          title={t('refill-policies.create.overwrite-title')}
          description={t('refill-policies.create.overwrite-body')}
          confirmLabel={t('refill-policies.create.overwrite-confirm')}
          onConfirm={form.startFromExample.onConfirm}
          onCancel={form.startFromExample.onCancelConfirm}
        />
      ) : null}

      {form.mode === 'edit' ? (
        <InlineStatus>{t('refill-policies.edit.no-prefill-note')}</InlineStatus>
      ) : null}

      <Card>
        <Field
          label={t('refill-policies.form.policy-set-id')}
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
            {t('refill-policies.form.saved-revision', {
              revisionId: form.savedRevision.revisionId,
              policyRevision: form.savedRevision.policyRevision,
            })}
          </InlineStatus>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={!form.canSubmit}
            onClick={form.onActivate}>
            {form.activating
              ? t('refill-policies.form.activating')
              : t('refill-policies.form.activate')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!form.canSubmit}
            onClick={form.onSaveRevisionOnly}>
            {form.savingRevision
              ? t('refill-policies.form.saving-revision')
              : t('refill-policies.form.save-revision')}
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
  const { t } = useTranslation('admin');
  const { simulate } = screen;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('refill-policies.simulate.title', { policySetId: simulate.policySetId })}
        subtitle={t('refill-policies.simulate.subtitle')}
        action={
          <Button type="button" variant="ghost" size="sm" onClick={simulate.onBack}>
            {t('refill-policies.simulate.back')}
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
