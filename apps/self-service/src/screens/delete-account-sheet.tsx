import React from 'react';
import { useRouter } from 'expo-router';
import { useDeleteAccount } from '@lightbridge/hooks';
import { DeleteAccountView } from '../views/delete-account-view';

type DeleteAccountSheetProps = {
  id: string;
  name: string;
  /** Dismiss the hosting sheet (Cancel; on success we dismiss then leave). */
  onClose: () => void;
};

/**
 * Content for the delete-account bottom sheet. Owns the useDeleteAccount
 * mutation and composes the presentational DeleteAccountView; presented
 * imperatively via `useSheet().present(...)`. On success it dismisses the sheet
 * and returns the user home.
 */
export function DeleteAccountSheet({ id, name, onClose }: Readonly<DeleteAccountSheetProps>) {
  const router = useRouter();
  const removeAccount = useDeleteAccount();

  const handleConfirm = async () => {
    await removeAccount.mutateAsync({ id });
    onClose();
    router.replace('/home');
  };

  return (
    <DeleteAccountView
      name={name}
      loading={removeAccount.isPending}
      onCancel={onClose}
      onConfirm={handleConfirm}
    />
  );
}
