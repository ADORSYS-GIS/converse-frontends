import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  getApiErrorMessage,
  useAccounts,
  useAuthSession,
  useDisableAccount,
  useEnableAccount,
  usePermissions,
  useQueryState,
  useUpdateAccount,
} from '@lightbridge/hooks';
import type { Account } from '@lightbridge/hooks';
import { useSheet } from '@lightbridge/ui/sheet';
import { AccountSettingsView } from '../views/settings/account-settings-view';
import { DeleteAccountSheet } from './delete-account-sheet';
import { useRuntimeConfig } from '../configs/runtime-config';

/**
 * Account settings after lightbridge-authz ADR-0006.
 *
 * The account surface is deliberately much smaller than it was. One account is one person, keyed
 * server-side on the caller's JWT subject, which removes three things this screen used to own:
 *
 * - the members roster (there is no account-level membership at all — rosters are per project now,
 *   see the project settings screen),
 * - "set as default" (with a single account there is nothing to default away from),
 * - the billing identity (moved to the project, so one person can bill projects to different
 *   parties).
 *
 * What remains is the account's own governance tier, its lifecycle, and deletion. The account
 * selector is kept because the list endpoint is still a list, but in practice it holds one entry.
 */
export function AccountSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const sheet = useSheet();
  const config = useRuntimeConfig();
  const { session } = useAuthSession();
  const { has } = usePermissions();
  const [accountParam, setAccountParam] = useQueryState('accountId');

  const { data: accounts = [], isLoading: isAccountsLoading } = useAccounts();
  const accountParamInList = accounts.some((account) => account.id === accountParam);
  const accountId = (accountParamInList ? accountParam : undefined) ?? accounts[0]?.id;
  const selectedAccount: Account | undefined = accounts.find((account) => account.id === accountId);

  const updateAccount = useUpdateAccount();
  const disableAccount = useDisableAccount();
  const enableAccount = useEnableAccount();

  const handleSaveDefaultQuota = (value: string) => {
    if (!selectedAccount?.id) return;
    void updateAccount.mutateAsync({
      id: selectedAccount.id,
      input: { defaultQuota: value === '' ? undefined : value },
    });
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount?.id) return;
    const id = selectedAccount.id;
    sheet.present(({ dismiss }) => (
      <DeleteAccountSheet
        id={id}
        name={session.user?.email ?? session.user?.name ?? id}
        onClose={dismiss}
      />
    ));
  };

  const handleSuspendAccount = () => {
    if (!selectedAccount?.id) return;
    void disableAccount.mutateAsync({ id: selectedAccount.id });
  };

  const handleEnableAccount = () => {
    if (!selectedAccount?.id) return;
    void enableAccount.mutateAsync({ id: selectedAccount.id });
  };

  const statusError = disableAccount.error
    ? getApiErrorMessage(disableAccount.error)
    : enableAccount.error
      ? getApiErrorMessage(enableAccount.error)
      : null;

  return (
    <AccountSettingsView
      showBackButton={!embedded}
      onBack={() => router.back()}
      accounts={accounts}
      selectedAccountId={accountId}
      isLoading={isAccountsLoading}
      onSelectAccount={setAccountParam}
      defaultQuota={selectedAccount?.defaultQuota ?? ''}
      onSaveDefaultQuota={handleSaveDefaultQuota}
      isSavingDefaultQuota={updateAccount.isPending}
      authIssuer={config.keycloak.issuer}
      authUserLabel={
        session.user?.email ?? session.user?.name ?? t('settings.account.authUserLabel')
      }
      status={(selectedAccount?.status as 'active' | 'suspended' | undefined) ?? 'active'}
      canUpdate={has('account:update')}
      canDelete={has('account:delete')}
      canDisable={has('account:disable')}
      onDeleteAccount={handleDeleteAccount}
      onSuspendAccount={handleSuspendAccount}
      onEnableAccount={handleEnableAccount}
      isChangingStatus={disableAccount.isPending || enableAccount.isPending}
      statusError={statusError}
    />
  );
}
