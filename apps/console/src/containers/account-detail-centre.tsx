'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';

import { AccountDetailSubNav } from './account-detail-sub-nav';
import { useAccountDetailScreen } from './use-account-detail-screen';

/**
 * `/settings/accounts/<id>` — the account detail screen (IA v3 phase E, owner: "account related
 * settings like e.g members"). Three cards, in the order a visitor thinks about them:
 *
 *  1. `AccountSettings` — rename + id/status/tier facts, the SAME section `/settings/policies`
 *     used to render before this phase moved it here.
 *  2. `Budget` — the honest budget-ceiling fact, home-account-gated (see `use-account-detail-
 *     screen.ts`'s own doc comment), with a `Request refill` action into the third sub-nav tab.
 *  3. `Members` — disabled with a stated reason (lightbridge-authz#594): `Account` carries no
 *     membership concept today, only `Project` does.
 */
export function AccountDetailCentre() {
  const screen = useAccountDetailScreen();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={screen.accountLabel ?? 'Account'} subtitle={screen.accountId} />

      <AccountDetailSubNav accountId={screen.accountId} />

      <AccountSettings {...screen.accountSettings} />

      <Card title="Budget">
        <div className="flex flex-col gap-4">
          {screen.budget.status === 'loading' ? (
            <SkeletonMetric width={140} />
          ) : screen.budget.status === 'error' ? (
            <ErrorLine message={screen.budget.caption} onRetry={screen.budget.onRetry} />
          ) : screen.budget.status === 'unavailable' ? (
            <InlineStatus>{screen.budget.caption}</InlineStatus>
          ) : (
            <p className="text-ink font-mono text-[13px]" data-numeral>
              {screen.budget.ceilingLabel} budget ceiling this period
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            nativeButton={false}
            render={<Link href={screen.requestRefillHref} />}
            className="self-start">
            Request refill…
          </Button>
        </div>
      </Card>

      <Card title="Members">
        <InlineStatus>{screen.membersReason}</InlineStatus>
      </Card>
    </div>
  );
}
