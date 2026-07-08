import React from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import type { SheetHandle, SheetProps } from './types';

/**
 * Presentational bottom sheet — a thin wrapper over @gorhom/bottom-sheet that
 * owns the backdrop, pan-down-to-close, and the dismiss → onClose mapping. It
 * holds no business logic; screens/smart components pass content + onClose and
 * call `close()` via ref for an explicit dismiss (e.g. a Cancel button).
 *
 * Requires a `GestureHandlerRootView` at the app root (react-native-gesture-handler).
 */
export const Sheet = React.forwardRef<SheetHandle, SheetProps>(function Sheet(
  { children, onClose, snapPoints, contentStyle },
  ref
) {
  const innerRef = React.useRef<BottomSheet>(null);

  React.useImperativeHandle(ref, () => ({
    close: () => innerRef.current?.close(),
  }));

  const handleChange = React.useCallback(
    (index: number) => {
      if (index === -1) {
        onClose?.();
      }
    },
    [onClose]
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
        ref={innerRef}
        index={0}
        enableDynamicSizing={!snapPoints}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleChange}>
        <BottomSheetView style={[styles.content, contentStyle]}>{children}</BottomSheetView>
      </BottomSheet>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
});
