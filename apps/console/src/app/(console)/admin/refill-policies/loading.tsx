'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../i18n/client';

/**
 * `/admin/refill-policies` centre loading skeleton. The route itself is `async`
 * (`readSession()` before the role gate), so this boundary also covers that real server-side
 * latency, not just the client chunk fetch.
 *
 * Matches the LIST mode's default (no-lookup-yet) geometry — the only mode a fresh navigation to
 * the bare path can land on — three cards: the lookup zone, the ladder, and the manual. Neither
 * of the mode params this route can also carry (`?edit=`/`?simulate=`) has a longer server
 * round-trip than the bare-path gate itself, so one shared skeleton covers both honestly enough
 * without hand-building a second. `create` moved to its own route/loading boundary (owner review
 * round 2, 2026-08-31, converse-frontends#368 finding #4) — `admin/refill-policies/create/
 * loading.tsx` — so it is no longer one of the modes this skeleton needs to cover.
 */
export default function AdminRefillPoliciesLoading() {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('refill-policies.title')} subtitle={t('refill-policies.loading')} />

      <Card>
        <SkeletonMetric width={240} />
      </Card>

      <Card title={t('refill-policies.ladder-title')}>
        <SkeletonMetric width={160} />
      </Card>

      <Card>
        <SkeletonMetric width={200} />
      </Card>
    </div>
  );
}
