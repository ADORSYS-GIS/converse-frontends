'use client';

import { useMemo } from 'react';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { OVERVIEW_RANGES, useSettingsOverviewParams } from '../client/url-state';
import { useConsoleScope } from '../client/use-console-scope';
import { DashboardRenderer } from '../dashboards/dashboard-renderer';
import type { DashboardPageSpec } from '../dashboards/dashboard-spec';
import { useDashboard } from '../dashboards/use-dashboard';
import { useDashboardKnobs } from '../dashboards/use-dashboard-knobs';
import { useTranslation } from '../i18n/client';
import { familyAccountIds, familyTruncationCap } from './account-family';
import { rangeLabels, rangePresets } from './overview-range';
import { resolveOverviewWindow, toUrlDate } from './overview-usage';
import { useDashboardLabels } from './use-dashboard-labels';

/**
 * `/settings/overview/usage` — the signed-in identity's own ACCOUNT FAMILY overview, rendered from
 * `dashboards.yaml` (converse-frontends#455, story C12; decision D-K).
 *
 * **This page is why `scope: family` exists.** It is not the estate: `scope: all` answers for every
 * account on the deployment and is gated on `usage:read-all`, which most people signing in do not
 * hold — `/admin/overview` is the page that asks that question. What this page has always shown is
 * the accounts THIS identity can see, and the usage API has no scope for that (lightbridge-authz
 * #578), so it has always been a fan-out: one account-scoped query per family account, capped,
 * combined client-side. C12 moved that fan-out from a hand-written hook
 * (`use-usage-overview-screen.ts`, deleted with `usage-overview-usage.ts`) into the resolver, as a
 * `scope: family` expansion — so the panels are ordinary YAML and the combination is the engine's
 * ordinary per-(key, bucket) grouping rather than a bespoke set of combiners.
 *
 * **What stays here** is what belongs to the PAGE rather than to a panel: the cap itself and the
 * caption that states it. The resolver is handed an already-capped list precisely so it can never
 * silently truncate one — a page that queried 25 of 61 accounts and said nothing would be
 * reporting a family total that is not the family's total.
 *
 * **Sixteen panels since the 2026-09-03 parity directive** ("it should have the same amount of
 * dashboards as /accounts/:id/overview but cross accounts"): the account page's whole set —
 * comparing stats, spend over time, the by-project / by-model / by-API-key breakdowns, latency by
 * model, all four rings — plus the four only a family can draw (Accounts, Cost / request, Spend by
 * account, and the Cost-by-account ring). FIVE query shapes × N accounts (N ≤ 25), the same five
 * the account page fires; `options.dimension` is what keeps sixteen panels down to five shapes.
 *
 * **What did NOT cross over is stated on the page, not left to be noticed.** The account overview's
 * BUDGET card, its API-key expiry reading and its refill CTA are RPCs against a billing period, not
 * usage queries over this range — and `getMyBudgetBalance` structurally answers for one account.
 * Summing 25 ceilings would invent an allowance nobody granted; showing one would label it as the
 * family's. `ACCOUNT_ONLY_ZONES_CAPTION_KEY` below says so where the absence is, and points at the
 * per-account page that does answer it.
 *
 * **No Export action here, and that is a decision rather than an omission.** C10's
 * `/api/reports/page` re-resolves a page's YAML entry server-side, and a `scope: family` panel
 * needs the CALLER'S OWN account family — a list this route has no session to read. Rendering the
 * button anyway would hand a reader a document in which every panel says "could not be loaded",
 * which reads as "no usage" rather than "this cannot be asked here". `page-report.ts` refuses such
 * a route with `unexportable_route` for the same reason, so a hand-built URL gets the same answer.
 * Exporting one account at a time (`/accounts/<id>/overview`) is the honest alternative, and it
 * works today.
 */

/**
 * Why this page carries every usage panel `/accounts/<id>/overview` has and none of its
 * budget-shaped ones — stated once, on the page, where a reader would otherwise notice an absence
 * and guess at it. The sentence itself lives in the `settings` bundle (ADR 0017); this is the KEY,
 * so the two exports that used to be one constant stay one thing to change.
 */
export const ACCOUNT_ONLY_ZONES_CAPTION_KEY = 'usage-overview.account-only-zones';

export interface UsageOverviewCentreProps {
  /** The validated `/settings/overview/usage` entry, read by the route's server component. */
  page: DashboardPageSpec;
}

export function UsageOverviewCentre({ page }: UsageOverviewCentreProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const labels = rangeLabels(tCommon);
  const scope = useConsoleScope();
  const [view, setView] = useSettingsOverviewParams();
  const localLabels = useDashboardLabels();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const allAccountIds = useMemo(
    () => scope.allAccounts.map((account) => account.id),
    [scope.allAccounts]
  );
  const includedIds = useMemo(() => familyAccountIds(allAccountIds), [allAccountIds]);
  // The CAP, not a finished sentence: the caption is copy and belongs in the bundle, while
  // "did we truncate, and at what number" is the fact `account-family.ts` owns.
  const truncatedAt = familyTruncationCap(allAccountIds.length);

  const knobs = useDashboardKnobs(page);

  const dashboard = useDashboard({
    page,
    window,
    familyAccountIds: includedIds,
    ...knobs,
    localLabels,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('usage-overview.title')}
        subtitle={t('usage-overview.subtitle', {
          range: labels[view.range],
          timezone: tCommon('timezone.utc'),
        })}
        controls={
          <DateRangeField
            label={tCommon('range.label')}
            presets={rangePresets(tCommon)}
            preset={view.from && view.to ? null : view.range}
            value={{ from: window.start, to: window.end }}
            onPresetChange={(range) => {
              void setView({ range: range as (typeof OVERVIEW_RANGES)[number], from: '', to: '' });
            }}
            onRangeChange={({ from, to }) => {
              void setView({ from: toUrlDate(from), to: toUrlDate(to) });
            }}
            layout="inline"
            hideLabel
          />
        }
      />

      {truncatedAt !== null ? (
        <InlineStatus>
          {t('usage-overview.family-truncated', {
            cap: truncatedAt,
            total: allAccountIds.length,
          })}
        </InlineStatus>
      ) : null}

      <InlineStatus>{t(ACCOUNT_ONLY_ZONES_CAPTION_KEY)}</InlineStatus>

      <DashboardRenderer state={dashboard} />
    </div>
  );
}
