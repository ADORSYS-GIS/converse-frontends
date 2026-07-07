import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeleteAccount } from '@lightbridge/hooks';
import { DeleteAccountView } from '../views/delete-account-view';

export function DeleteAccountModal() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const removeAccount = useDeleteAccount();

  const handleConfirm = async () => {
    if (!id) {
      router.back();
      return;
    }
    await removeAccount.mutateAsync({ id });
    router.replace('/home');
  };

  return (
    <DeleteAccountView
      name={name}
      loading={removeAccount.isPending}
      onCancel={() => router.back()}
      onConfirm={handleConfirm}
    />
  );
}
