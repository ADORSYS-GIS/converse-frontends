import React from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { SheetContext } from './use-sheet';
import type { SheetApi, SheetOptions, SheetProviderProps, SheetRender } from './types';

type SheetEntry = {
  render: SheetRender;
  options?: SheetOptions;
};

/**
 * App-root host for imperative bottom sheets. Mounts a single reusable
 * `BottomSheetModal` and exposes {@link SheetApi} via context, so any screen can
 * `present()` a sheet without owning a route, the backdrop, or gorhom wiring.
 * One sheet shows at a time — `present()` replaces whatever is open.
 *
 * Requires a `GestureHandlerRootView` above it (react-native-gesture-handler).
 * Kept behind the `@lightbridge/ui/sheet` subpath: it pulls in reanimated, which
 * crashes under jest, so it must never reach the main barrel.
 */
export function SheetProvider({
  children,
  backgroundColor,
  handleIndicatorColor,
}: SheetProviderProps) {
  const modalRef = React.useRef<BottomSheetModal>(null);
  const [entry, setEntry] = React.useState<SheetEntry | null>(null);
  // Held in a ref so the dismiss handler reads the latest onClose without
  // re-subscribing gorhom's callback on every present().
  const onCloseRef = React.useRef<SheetOptions['onClose']>(undefined);

  const dismiss = React.useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  const present = React.useCallback<SheetApi['present']>((render, options) => {
    onCloseRef.current = options?.onClose;
    setEntry({ render, options });
  }, []);

  // Present after the content is committed so the first frame already has body
  // measured (dynamic sizing) rather than animating up empty.
  React.useEffect(() => {
    if (entry) {
      modalRef.current?.present();
    }
  }, [entry]);

  const handleDismiss = React.useCallback(() => {
    onCloseRef.current?.();
    onCloseRef.current = undefined;
    setEntry(null);
  }, []);

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

  const api = React.useMemo<SheetApi>(() => ({ present, dismiss }), [present, dismiss]);

  const backgroundStyle = React.useMemo(
    () => [styles.background, backgroundColor ? { backgroundColor } : null],
    [backgroundColor]
  );
  const handleIndicatorStyle = handleIndicatorColor
    ? { backgroundColor: handleIndicatorColor }
    : undefined;

  return (
    <SheetContext.Provider value={api}>
      <BottomSheetModalProvider>
        {children}
        <BottomSheetModal
          ref={modalRef}
          enableDynamicSizing={!entry?.options?.snapPoints}
          snapPoints={entry?.options?.snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={backgroundStyle}
          handleIndicatorStyle={handleIndicatorStyle}
          onDismiss={handleDismiss}>
          <BottomSheetView style={[styles.content, entry?.options?.contentStyle]}>
            {entry ? entry.render({ dismiss }) : null}
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </SheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingBottom: 24,
  },
});
