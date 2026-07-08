import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sheet, type SheetHandle } from '@lightbridge/ui/sheet';
import { useDeleteAccount } from '@lightbridge/hooks';
import { DeleteAccountView } from '../views/delete-account-view';

/**
 * Per-flow smart wrapper for the delete-account bottom sheet: it owns the domain
 * wiring (route params, the useDeleteAccount mutation, navigation) and composes
 * the presentational Sheet + DeleteAccountView. The sheet mechanics live in
 * @lightbridge/ui — this screen has no @gorhom/bottom-sheet import.
 */
export function DeleteAccountModal() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const removeAccount = useDeleteAccount();
  const sheetRef = React.useRef<SheetHandle>(null);

  const handleConfirm = async () => {
    if (!id) {
      router.back();
      return;
    }
    await removeAccount.mutateAsync({ id });
    router.replace('/home');
  };

  return (
    <Sheet ref={sheetRef} onClose={() => router.back()}>
      <DeleteAccountView
        name={name}
        loading={removeAccount.isPending}
        onCancel={() => sheetRef.current?.close()}
        onConfirm={handleConfirm}
      />
    </Sheet>
  );
}
