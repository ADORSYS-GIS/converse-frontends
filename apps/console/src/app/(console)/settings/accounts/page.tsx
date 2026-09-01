import { AccountsCentre } from '../../../../containers/accounts-centre';

/**
 * `/settings/accounts` — the identity's account family, plus account creation (IA v3 phase E,
 * moved off `/settings/policies`). `force-dynamic` is inherited from `settings/layout.tsx`.
 */
export default function SettingsAccountsRoute() {
  return <AccountsCentre />;
}
