import React, { useCallback } from 'react';
import { PickerList } from '@lightbridge/ui';
import type { PickerOption } from '@lightbridge/ui';
import { useSheet } from '@lightbridge/ui/sheet';

export type PickerSheetParams = {
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  searchPlaceholder: string;
  noResultsLabel: string;
  title: string;
  /** Already-formatted, i18n-pluralized count caption (e.g. "12 projects"). */
  resultCountLabel?: string;
  optionAccessibilityLabel?: (option: PickerOption) => string;
};

/**
 * Presents `PickerList` (the searchable sheet body `Picker` opens once its trigger row is
 * pressed) through this app's existing imperative sheet API.
 *
 * Screen-only, deliberately: `useSheet` comes from the `@lightbridge/ui/sheet` subpath, which
 * pulls in `@gorhom/bottom-sheet` → `react-native-reanimated` → worklets — real native modules
 * that crash under Jest unless a real app runtime initialized them first (see that subpath's own
 * doc comment: "Sheet is intentionally NOT re-exported from the barrel"). Views are unit-tested by
 * rendering them standalone, with no `SheetProvider`/`GestureHandlerRootView` ancestor, so this
 * hook — like every other sheet.present(...) call in this app (create/delete/rotate/revoke) —
 * stays in the screen. `EntityPickerField` (the view-facing half of this feature) only ever
 * receives a plain `onOpenPicker: () => void` callback; it has no idea a sheet exists.
 */
export function usePickerSheet() {
  const sheet = useSheet();

  return useCallback(
    (params: PickerSheetParams) => {
      sheet.present(
        ({ dismiss }) => (
          <PickerList
            options={params.options}
            selectedId={params.selectedId}
            onSelect={(id) => {
              params.onSelect(id);
              dismiss();
            }}
            searchPlaceholder={params.searchPlaceholder}
            noResultsLabel={params.noResultsLabel}
            title={params.title}
            resultCountLabel={params.resultCountLabel}
            optionAccessibilityLabel={params.optionAccessibilityLabel}
          />
        ),
        { accessibilityLabel: params.title }
      );
    },
    [sheet]
  );
}
