import React from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { designTokens } from '../../design/tokens';
import { useIsDesktop } from '../../hooks/use-is-desktop';
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
  { children, onClose, snapPoints, contentStyle, accessibilityLabel },
  ref
) {
  const isDesktop = useIsDesktop();
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
        // Gorhom's `backgroundStyle` type omits `left`/etc, but its merge order
        // applies our style after its own absoluteFill, so `left` does take
        // effect at runtime — see provider.tsx for the full explanation.
        backgroundStyle={
          (isDesktop
            ? [styles.background, styles.backgroundDesktopInset]
            : styles.background) as any
        }
        onChange={handleChange}>
        <BottomSheetView
          style={styles.content}
          accessibilityRole="alert"
          accessibilityLabel={accessibilityLabel}>
          <View style={isDesktop ? styles.contentDesktopInset : undefined}>
            <View style={[styles.contentColumn, contentStyle]}>{children}</View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // See provider.tsx's identical styles for the full explanation: gorhom
  // merges its own absolute-fill styles after ours for the background (so
  // our overrides win) but before ours for BottomSheetView (so ours would be
  // silently undone) — and page routes get a desktop-only navRailWidth inset
  // from `(tabs)/_layout.tsx` before centering, which the sheet must mirror
  // to land on the same centered column.
  background: {
    width: '100%',
    maxWidth: designTokens.layout.maxContentWidth,
    marginHorizontal: 'auto',
  },
  backgroundDesktopInset: {
    left: designTokens.layout.navRailWidth,
  },
  content: {
    paddingBottom: 24,
  },
  contentDesktopInset: {
    paddingLeft: designTokens.layout.navRailWidth,
  },
  contentColumn: {
    width: '100%',
    maxWidth: designTokens.layout.maxContentWidth,
    marginHorizontal: 'auto',
  },
});
