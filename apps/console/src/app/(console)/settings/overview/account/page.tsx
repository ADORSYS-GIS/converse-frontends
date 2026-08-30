import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';

/**
 * `/settings/overview/account` — the account-scoped analytics lens (IA v3 phase 4). `force-dynamic`
 * is inherited from `settings/layout.tsx`. A thin wrapper around the one shared composition —
 * `use-settings-overview-screen.ts`'s own doc comment explains what "scope-parameterized" means
 * and why this route differs from `/settings/overview/project`/`user` only in the literal it passes.
 */
export default function SettingsOverviewAccountRoute() {
  return <SettingsOverviewCentre lens="account" />;
}
