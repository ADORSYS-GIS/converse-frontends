import React from 'react';
import { useCreateAccount } from '@lightbridge/hooks';
import { CreateAccountView } from '../views/create-account-view';

type CreateAccountSheetProps = {
  /** Dismiss the hosting sheet (Cancel or after a successful create). */
  onClose: () => void;
  /** Called with the new account id so the caller can select it. */
  onCreated?: (accountId: string) => void;
};

/**
 * Content for the create-account bottom sheet. Owns the domain wiring (the
 * useCreateAccount mutation) and composes the presentational CreateAccountView;
 * it is presented imperatively via `useSheet().present(...)`, so it takes its
 * callbacks as props rather than reading the URL.
 */
export function CreateAccountSheet({ onClose, onCreated }: Readonly<CreateAccountSheetProps>) {
  const createAccount = useCreateAccount();

  const handleConfirm = async ({ billingIdentity }: { billingIdentity: string }) => {
    const account = await createAccount.mutateAsync({ billingIdentity });
    onCreated?.(account.id);
    onClose();
  };

  return (
    <CreateAccountView
      loading={createAccount.isPending}
      onCancel={onClose}
      onConfirm={(input) => {
        void handleConfirm(input).catch((error) => {
          console.error('Failed to create account:', error);
        });
      }}
    />
  );
}
