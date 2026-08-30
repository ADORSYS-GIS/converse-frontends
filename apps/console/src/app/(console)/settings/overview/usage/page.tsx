import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/settings/overview/usage` — the settings area's landing lens (owner directive: the
 * cross-account usage overlay is what "Overview" opens on). `force-dynamic` is inherited from
 * `settings/layout.tsx`, so no export of its own is needed here.
 *
 * An honest placeholder, not a stub pretending to be finished: the real cross-account usage
 * overlay (charts, per-account/per-project breakdowns) is IA v3 phase 4 work, out of THIS phase's
 * scope. Shipping the redirect chain (`/settings` → `/settings/overview` → here) without a page
 * at the end of it would 404 the settings area's own landing destination, which is worse than an
 * honest "not yet" line — the console-ui skill's "never fabricate" clause is why this is one
 * sentence and no charts, not a mocked-up dashboard standing in for data nothing here queries.
 */
export default function SettingsOverviewUsageRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usage overview" subtitle="Cross-account usage" />
      <InlineStatus>Analytics lenses land with IA v3 phase 4.</InlineStatus>
    </div>
  );
}
