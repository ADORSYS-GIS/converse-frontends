import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  getApiErrorMessage,
  useAccounts,
  useAddAccountMember,
  useAuthSession,
  useDisableAccount,
  useEnableAccount,
  usePermissions,
  useQueryState,
  useRemoveAccountMember,
  useUpdateAccount,
} from '@lightbridge/hooks';
import type { Account } from '@lightbridge/hooks';
import { useSheet } from '@lightbridge/ui/sheet';
import { AccountSettingsView } from '../views/settings/account-settings-view';
import { CreateAccountSheet } from './create-account-sheet';
import { DeleteAccountSheet } from './delete-account-sheet';
import { useRuntimeConfig } from '../configs/runtime-config';

export function AccountSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const sheet = useSheet();
  const config = useRuntimeConfig();
  const { session } = useAuthSession();
  const { has } = usePermissions();
  // Account selection lives in the URL (?accountId=…) so it survives refresh and
  // deep-links — same pattern as the project settings screen.
  const [accountParam, setAccountParam] = useQueryState('accountId');

  const { data: accounts = [], isLoading: isAccountsLoading } = useAccounts();
  const accountParamInList = accounts.some((account) => account.id === accountParam);
  const accountId = (accountParamInList ? accountParam : undefined) ?? accounts[0]?.id;
  const selectedAccount: Account | undefined = accounts.find((account) => account.id === accountId);

  const updateAccount = useUpdateAccount();
  const disableAccount = useDisableAccount();
  const enableAccount = useEnableAccount();
  const addMember = useAddAccountMember();
  const removeMember = useRemoveAccountMember();

  // The Account model no longer carries a member/owners list on the wire —
  // membership is managed purely through add/removeAccountMember mutations,
  // so there is nothing to seed the chip list with until a listing RPC exists.
  const owners: string[] = [];

  const handleSaveBillingIdentity = (value: string) => {
    if (!selectedAccount?.id) return;
    void updateAccount.mutateAsync({ id: selectedAccount.id, input: { billingIdentity: value } });
  };

  const handleAddOwner = (value: string) => {
    if (!selectedAccount?.id || owners.includes(value)) return;
    void addMember.mutateAsync({ id: selectedAccount.id, subject: value });
  };

  const handleRemoveOwner = (value: string) => {
    if (!selectedAccount?.id) return;
    void removeMember.mutateAsync({ id: selectedAccount.id, subject: value });
  };

  const handleCreateAccount = () => {
    sheet.present(({ dismiss }) => (
      <CreateAccountSheet
        onClose={dismiss}
        onCreated={(newAccountId) => setAccountParam(newAccountId)}
      />
    ));
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount?.id) return;
    const accountId = selectedAccount.id;
    const accountName = selectedAccount.billingIdentity;
    sheet.present(({ dismiss }) => (
      <DeleteAccountSheet id={accountId} name={accountName} onClose={dismiss} />
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

  const memberError = addMember.error
    ? getApiErrorMessage(addMember.error)
    : removeMember.error
      ? getApiErrorMessage(removeMember.error)
      : null;

  return (
    <AccountSettingsView
      showBackButton={!embedded}
      onBack={() => router.back()}
      accounts={accounts}
      selectedAccountId={accountId}
      isLoading={isAccountsLoading}
      onSelectAccount={setAccountParam}
      onCreateAccount={handleCreateAccount}
      billingIdentity={selectedAccount?.billingIdentity ?? ''}
      onSaveBillingIdentity={handleSaveBillingIdentity}
      isSavingBillingIdentity={updateAccount.isPending}
      owners={owners}
      onAddOwner={handleAddOwner}
      onRemoveOwner={handleRemoveOwner}
      isSavingOwners={addMember.isPending || removeMember.isPending}
      authIssuer={config.keycloak.issuer}
      authUserLabel={
        session.user?.email ?? session.user?.name ?? t('settings.account.authUserLabel')
      }
      status={(selectedAccount?.status as 'active' | 'suspended' | undefined) ?? 'active'}
      canCreate={has('account:create')}
      canUpdate={has('account:update')}
      canManageMembers={has('account:member')}
      canDelete={has('account:delete')}
      canDisable={has('account:disable')}
      onDeleteAccount={handleDeleteAccount}
      onSuspendAccount={handleSuspendAccount}
      onEnableAccount={handleEnableAccount}
      isChangingStatus={disableAccount.isPending || enableAccount.isPending}
      statusError={statusError}
      memberError={memberError}
    />
  );
}
