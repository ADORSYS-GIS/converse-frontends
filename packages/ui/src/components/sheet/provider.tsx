import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { designTokens } from '../../design/tokens';
import { useIsDesktop } from '../../hooks/use-is-desktop';
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
  const isDesktop = useIsDesktop();
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

  // Gorhom's `backgroundStyle` type omits `left`/`right`/etc — but its actual
  // merge order applies our style *after* its own absoluteFill, so `left`
  // does take effect at runtime (verified by reading BottomSheetBackgroundContainer).
  // The `any` cast only bypasses the (overly strict) type, not the real behavior.
  const backgroundStyle = React.useMemo(
    () =>
      [
        styles.background,
        isDesktop ? styles.backgroundDesktopInset : null,
        backgroundColor ? { backgroundColor } : null,
      ] as any,
    [backgroundColor, isDesktop]
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
          <BottomSheetView
            style={styles.content}
            accessibilityRole="alert"
            accessibilityLabel={entry?.options?.accessibilityLabel}>
            <View style={isDesktop ? styles.contentDesktopInset : undefined}>
              <View style={[styles.contentColumn, entry?.options?.contentStyle]}>
                {/* `dismiss` only reads `modalRef.current` when invoked (on user
                    dismiss), never during render — the react-hooks/refs rule is
                    conservative here, so it's disabled for this line. */}
                {/* eslint-disable-next-line react-hooks/refs */}
                {entry ? entry.render({ dismiss }) : null}
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </SheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Gorhom positions the sheet's background as an absolute fill (left/right: 0)
  // *after* this style is merged, so width/alignSelf alone can't center it —
  // the auto-margin trick is what actually wins here.
  //
  // Page routes sit inside `(tabs)/_layout.tsx`'s `sceneStyle`, which adds
  // `paddingLeft: navRailWidth` on desktop before centering their content —
  // so their centered column lands `navRailWidth / 2` right of true viewport
  // center. The sheet is portaled at the app root, outside that nav-rail
  // split, so without the same offset it centers on the *full* viewport and
  // ends up looking shifted left relative to the page behind it. Nudging the
  // background's left anchor by `navRailWidth` reproduces the same "inset,
  // then center" math (see backgroundDesktopInset below).
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxWidth: designTokens.layout.maxContentWidth,
    marginHorizontal: 'auto',
  },
  backgroundDesktopInset: {
    left: designTokens.layout.navRailWidth,
  },
  // BottomSheetView itself is left as gorhom's plain absolute-fill container
  // (only vertical padding here) — it's just a measuring box for dynamic
  // sizing. The nav-rail inset + centered column live on plain nested Views
  // we render inside it, since gorhom's own styles.container always wins the
  // `left`/`right` merge for BottomSheetView and would silently undo any
  // horizontal shift we set directly on it.
  content: {
    paddingBottom: 24,
  },
  contentDesktopInset: {
    paddingLeft: designTokens.layout.navRailWidth,
  },
  // No horizontal padding here — sheet content views supply their own inset
  // via `<Page>` (matching the `p-6` that page routes get from `<Scroll>`)
  // so the two line up.
  contentColumn: {
    width: '100%',
    maxWidth: designTokens.layout.maxContentWidth,
    marginHorizontal: 'auto',
  },
});
