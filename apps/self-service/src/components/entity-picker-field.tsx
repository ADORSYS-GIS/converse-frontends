import React from 'react';
import { Icon as Feather, Picker, Stack, Text } from '@lightbridge/ui';
import type { PickerOption } from '@lightbridge/ui';
import type { Account, Project } from '@lightbridge/hooks';
import type { useThemeColors } from '../hooks/use-theme-colors';

/** Maps the account list to `PickerOption`s. An account has no display name beyond its id — same
 *  label the old per-screen `Button` loops rendered. */
export function toAccountPickerOptions(accounts: Account[]): PickerOption[] {
  return accounts.map((account) => ({ id: account.id, label: account.id }));
}

/**
 * Maps the project list to `PickerOption`s, preserving the star-for-default-project marker the
 * old per-screen `Button` loop rendered (project-settings only — the API-keys screen's own
 * loop never had this marker, so it simply won't show one there either, matching prior behavior).
 * `colors` is a plain value, not a hook call, so this stays callable from both a view (which
 * already holds `useThemeColors()`'s result for its own rendering) and a screen (see
 * `usePickerSheet` in ../hooks/use-picker-sheet, which needs the identical mapping to build the
 * sheet's option list).
 */
export function toProjectPickerOptions(
  projects: Project[],
  selectedProjectId: string | undefined,
  colors: ReturnType<typeof useThemeColors>
): PickerOption[] {
  return projects.map((project) => ({
    id: project.id,
    label: project.name,
    icon: project.isDefault ? (
      <Feather
        name="star"
        size={12}
        color={project.id === selectedProjectId ? colors.surface : colors.subtle}
      />
    ) : undefined,
  }));
}

export type EntityPickerFieldProps = {
  /** Field heading, e.g. "Account" / "Project" (rendered above the control). */
  label: string;
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /**
   * Called instead of selecting inline once `options.length` reaches the sheet threshold. This
   * component has no Sheet/reanimated dependency on purpose — it is used directly by *view*
   * modules, which are unit-tested standalone without a SheetProvider/GestureHandlerRootView
   * ancestor (see `@lightbridge/ui/sheet`'s own doc comment on why Sheet stays out of the main
   * barrel). The owning *screen* wires this to `usePickerSheet()` — see
   * ../hooks/use-picker-sheet.tsx — exactly like it already wires `onDeleteProject`/
   * `onCreateProject` to `useSheet().present(...)` for the create/delete/rotate/revoke flows.
   */
  onOpenPicker: () => void;
  /** Shown in place of the control when `options` is empty. */
  emptyLabel: string;
  /** Trigger-row label when nothing is selected yet (sheet mode only). */
  placeholderLabel: string;
  triggerAccessibilityLabel?: string;
  optionAccessibilityLabel?: (option: PickerOption) => string;
  /** Threshold at/above which selection opens a searchable sheet instead of an inline control. */
  sheetThreshold?: number;
  isLoading?: boolean;
};

/**
 * Shared account/project selector used on the API-keys, project-settings, and account-settings
 * screens — replaces what used to be an unbounded, wrapped row of `Button` pills duplicated
 * (with minor variations) across all three. Thin wrapper around `@lightbridge/ui`'s presentational
 * `Picker` that adds only the field heading; every string and the `onOpenPicker` callback come
 * from the caller.
 */
export function EntityPickerField({
  label,
  options,
  selectedId,
  onSelect,
  onOpenPicker,
  emptyLabel,
  placeholderLabel,
  triggerAccessibilityLabel,
  optionAccessibilityLabel,
  sheetThreshold,
  isLoading = false,
}: Readonly<EntityPickerFieldProps>) {
  return (
    <Stack gap="xs">
      <Text intent="bodyStrong">{label}</Text>
      <Picker
        options={options}
        selectedId={selectedId}
        onSelect={onSelect}
        onOpenPicker={onOpenPicker}
        sheetThreshold={sheetThreshold}
        emptyLabel={emptyLabel}
        placeholderLabel={placeholderLabel}
        triggerAccessibilityLabel={triggerAccessibilityLabel}
        optionAccessibilityLabel={optionAccessibilityLabel}
        isLoading={isLoading}
      />
    </Stack>
  );
}
