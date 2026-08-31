import { AccountDetailCentre } from '../../../../../containers/account-detail-centre';

export const dynamic = 'force-dynamic';

/**
 * `/settings/accounts/<id>` — account-scoped settings: rename, honest budget/tier facts, and a
 * Members block (IA v3 phase E). `force-dynamic` is inherited from `settings/layout.tsx`; the
 * account-ownership guard is `settings/accounts/[accountId]/layout.tsx`.
 */
export default function SettingsAccountDetailRoute() {
  return <AccountDetailCentre />;
}
