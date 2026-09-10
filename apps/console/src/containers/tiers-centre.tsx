'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SettingsRow } from '@lightbridge/ui-web/src/components/settings-row';
import { SkeletonRow } from '@lightbridge/ui-web/src/components/skeleton-row';
import { formatBillingPlanLimits } from '@lightbridge/ui-web/src/lib/billing-plan-limits';
import { NO_QUOTA_TIER_LABEL } from '@lightbridge/ui-web/src/lib/quota-tier';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';

import { useTranslation } from '../i18n/client';
import { useTiersScreen } from './use-tiers-screen';

/**
 * `/settings/tiers` — "Tier configs." Two read-only catalogues, no picker anywhere (see
 * `use-tiers-screen.ts`'s own doc comment for why the second one is a list of ASSIGNMENTS, not a
 * catalogue — no `listQuotaTiers` procedure exists yet, lightbridge-authz#572).
 *
 * "Billing plans" is a `ZoneHeading` directly on the floor, above one `Card` PER plan — never a
 * plan-list nested INSIDE a wrapping Card (console-ui skill: `Card` is a zone container, and a
 * `Card`-in-`Card` reads as a double border around the same information). "Assigned quota tiers"
 * is the opposite shape on purpose: it is one dataset (rows of the same kind), not a set of
 * independent catalogue entries, so it gets the ordinary single-`Card`-of-rows treatment every
 * other settings list in this console uses.
 */
export function TiersCentre() {
  const { t } = useTranslation('settings');
  const screen = useTiersScreen();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('tiers.title')} subtitle={screen.scopeLabel} />

      <div className="flex flex-col gap-3">
        <ZoneHeading label={t('tiers.billing-plans')} />
        {screen.plansError ? (
          <ErrorLine message={screen.plansError} onRetry={screen.onRetryPlans} />
        ) : screen.plansLoading ? (
          <div className="settings-list">
            <SkeletonRow columnCount={2} />
            <SkeletonRow columnCount={2} />
          </div>
        ) : screen.plans.length === 0 ? (
          <InlineStatus>{t('tiers.no-billing-plans')}</InlineStatus>
        ) : (
          <div className="flex flex-wrap gap-3">
            {screen.plans.map((plan) => (
              <Card key={plan.id} title={plan.name} className="min-w-[220px] flex-1">
                <div className="settings-list">
                  <SettingsRow label={t('tiers.plan-id')} value={plan.id} valueKind="data" />
                  <SettingsRow
                    label={t('tiers.limits')}
                    value={formatBillingPlanLimits(plan.limits)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card title={t('tiers.assigned-tiers')}>
        {screen.assignedTiersLoading ? (
          <div className="settings-list">
            <SkeletonRow columnCount={2} />
            <SkeletonRow columnCount={2} />
          </div>
        ) : screen.assignedTiers.length === 0 ? (
          <InlineStatus>{t('tiers.no-account-selected')}</InlineStatus>
        ) : (
          <div className="settings-list">
            {screen.assignedTiers.map((row) => (
              <SettingsRow
                key={row.key}
                label={row.label}
                value={row.quotaTier ?? NO_QUOTA_TIER_LABEL}
                valueMuted={row.quotaTier === null}
              />
            ))}
          </div>
        )}
        <InlineStatus className="mt-4">{t('tiers.no-catalogue-note')}</InlineStatus>
      </Card>
    </div>
  );
}
