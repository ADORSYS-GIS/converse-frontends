import type { ReactNode } from 'react';

/** A single selectable row. `id` is the value handed back through `onSelect`. */
export type PickerOption = {
  id: string;
  label: string;
  description?: string;
  /** Rendered in the leading slot both inline (SegmentedControl icon) and in the sheet list. */
  icon?: ReactNode;
};

export type PickerProps = {
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /**
   * Called instead of selecting inline once `options.length >= sheetThreshold`. The caller
   * decides how to present the picker (this component has no opinion on sheets/modals/routes) —
   * typically `sheet.present(() => <PickerList ... />)` via the app's existing imperative sheet
   * API. Ignored below the threshold, where selection happens inline.
   */
  onOpenPicker: () => void;
  /**
   * Item-count threshold at/above which this renders a tap-to-open trigger row instead of an
   * inline `SegmentedControl`. Defaults to 5 — below that, opening a sheet to choose between a
   * couple of options is more friction than it saves.
   */
  sheetThreshold?: number;
  /** Shown in place of the control when `options` is empty. */
  emptyLabel: string;
  /** Trigger-row label when nothing is selected yet (sheet mode only). */
  placeholderLabel: string;
  /** Accessibility label for the trigger row (sheet mode only). */
  triggerAccessibilityLabel?: string;
  /** Per-option accessibility label override; defaults to the option's own label. */
  optionAccessibilityLabel?: (option: PickerOption) => string;
  /** Shows a placeholder skeleton instead of the empty state while the first page is in flight. */
  isLoading?: boolean;
};

export type PickerListProps = {
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  searchPlaceholder: string;
  noResultsLabel: string;
  /** Optional heading rendered above the search field (e.g. "Select project"). */
  title?: string;
  /**
   * Optional, already-formatted result-count caption (e.g. "12 projects"). Pass the caller's own
   * i18n-pluralized string — this component does no counting or i18n of its own. Omit when the
   * count would not add information (e.g. a list too short to ever reach the sheet).
   */
  resultCountLabel?: string;
  optionAccessibilityLabel?: (option: PickerOption) => string;
};
