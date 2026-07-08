import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
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
  const sheetRef = React.useRef<BottomSheet>(null);

  const handleConfirm = async () => {
    if (!id) {
      router.back();
      return;
    }
    await removeAccount.mutateAsync({ id });
    router.replace('/home');
  };

  const handleSheetChange = React.useCallback(
    (index: number) => {
      // Dismissing the sheet (dragged/backdrop-tapped to closed) returns to the
      // previous route so the modal route stays in sync with the sheet state.
      if (index === -1) {
        router.back();
      }
    },
    [router]
  );

  const renderBackdrop = React.useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <View style={styles.container}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
      >
        <BottomSheetView style={styles.content}>
          <DeleteAccountView
            name={name}
            loading={removeAccount.isPending}
            onCancel={() => sheetRef.current?.close()}
            onConfirm={handleConfirm}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
});
