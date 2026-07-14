import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  getApiErrorMessage,
  useAuthSession,
  useCurrentAccount,
  useDisableAccount,
  useEnableAccount,
  usePermissions,
  useUpdateAccount,
} from '@lightbridge/hooks';
import { useSheet } from '@lightbridge/ui/sheet';
import { AccountSettingsView } from '../views/settings/account-settings-view';
import { DeleteAccountSheet } from './delete-account-sheet';
import { useRuntimeConfig } from '../configs/runtime-config';

export function AccountSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const sheet = useSheet();
  const config = useRuntimeConfig();
  const { session } = useAuthSession();
  const { has } = usePermissions();
  const { data: currentAccount } = useCurrentAccount();
  const updateAccount = useUpdateAccount();
  const disableAccount = useDisableAccount();
  const enableAccount = useEnableAccount();

  const owners = currentAccount?.owners_admins ?? [];

  const handleSaveBillingIdentity = (value: string) => {
    if (!currentAccount?.id) return;
    void updateAccount.mutateAsync({ id: currentAccount.id, input: { billing_identity: value } });
  };

  const handleAddOwner = (value: string) => {
    if (!currentAccount?.id || owners.includes(value)) return;
    void updateAccount.mutateAsync({
      id: currentAccount.id,
      input: { owners_admins: [...owners, value] },
    });
  };

  const handleRemoveOwner = (value: string) => {
    if (!currentAccount?.id) return;
    void updateAccount.mutateAsync({
      id: currentAccount.id,
      input: { owners_admins: owners.filter((owner) => owner !== value) },
    });
  };

  const handleDeleteAccount = () => {
    if (!currentAccount?.id) return;
    const accountId = currentAccount.id;
    const accountName = currentAccount.billing_identity;
    sheet.present(({ dismiss }) => (
      <DeleteAccountSheet id={accountId} name={accountName} onClose={dismiss} />
    ));
  };

  const handleSuspendAccount = () => {
    if (!currentAccount?.id) return;
    void disableAccount.mutateAsync({ id: currentAccount.id });
  };

  const handleEnableAccount = () => {
    if (!currentAccount?.id) return;
    void enableAccount.mutateAsync({ id: currentAccount.id });
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
      billingIdentity={currentAccount?.billing_identity ?? ''}
      onSaveBillingIdentity={handleSaveBillingIdentity}
      isSavingBillingIdentity={updateAccount.isPending}
      owners={owners}
      onAddOwner={handleAddOwner}
      onRemoveOwner={handleRemoveOwner}
      isSavingOwners={updateAccount.isPending}
      authIssuer={config.keycloak.issuer}
      authUserLabel={
        session.user?.email ?? session.user?.name ?? t('settings.account.authUserLabel')
      }
      status={currentAccount?.status ?? 'active'}
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
