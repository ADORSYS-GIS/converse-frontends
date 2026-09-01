import { UsageOverviewCentre } from '../../../../../containers/usage-overview-centre';

/**
 * `/settings/overview/usage` — the settings area's landing lens (owner directive: the
 * cross-account usage overlay is what "Overview" opens on). `force-dynamic` is inherited from
 * `settings/layout.tsx`.
 *
 * IA v3 phase 4 build: the real cross-account estate overview — stat row, estate spend-over-time
 * with a dashed previous-period comparison, spend by account, spend by model. See
 * `use-usage-overview-screen.ts`'s own doc comment for the fan-out design and the filed backend
 * gap (`lightbridge-authz#578`) behind its account cap.
 */
export default function SettingsOverviewUsageRoute() {
  return <UsageOverviewCentre />;
}
