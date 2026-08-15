import React, { useMemo, useState } from 'react';

import { ListRow } from '../list-row';
import { Scroll } from '../scroll';
import { SegmentedControl } from '../segmented-control';
import { Skeleton } from '../skeleton';
import { Stack } from '../stack';
import { Text } from '../text';
import { TextField } from '../text-field';
import type { PickerListProps, PickerProps } from './types';

/**
 * Selection control for a list of `PickerOption`s. Renders one of two shapes depending on
 * `options.length` vs `sheetThreshold`:
 *
 * - Below the threshold: an inline `SegmentedControl` — correct group accessibility semantics
 *   for free, no extra tap to open anything.
 * - At/above the threshold: a tap-to-open trigger row. This component never opens anything
 *   itself (no Sheet/modal/route dependency) — `onOpenPicker` hands control back to the caller,
 *   which is expected to present {@link PickerList} (e.g. via the app's imperative sheet API).
 *
 * Fetches no data and owns no i18n: every string is a prop.
 */
export function Picker({
  options,
  selectedId,
  onSelect,
  onOpenPicker,
  sheetThreshold = 5,
  emptyLabel,
  placeholderLabel,
  triggerAccessibilityLabel,
  optionAccessibilityLabel,
  isLoading = false,
}: Readonly<PickerProps>) {
  if (options.length === 0) {
    if (isLoading) {
      return <Skeleton width={140} height={36} rounded="xl" />;
    }
    return <Text intent="caption">{emptyLabel}</Text>;
  }

  if (options.length < sheetThreshold) {
    return (
      <SegmentedControl
        width="full"
        value={selectedId ?? ''}
        onChange={onSelect}
        options={options.map((option) => ({
          key: option.id,
          label: option.label,
          icon: option.icon,
          accessibilityLabel: optionAccessibilityLabel?.(option) ?? option.label,
        }))}
      />
    );
  }

  const selected = options.find((option) => option.id === selectedId);

  return (
    <ListRow
      tone="muted"
      pad="sm"
      rounded="md"
      onPress={onOpenPicker}
      accessibilityLabel={triggerAccessibilityLabel}
      title={selected?.label ?? placeholderLabel}
      leading={selected?.icon}
      trailing={<Text intent="caption">⌄</Text>}
    />
  );
}

/**
 * Searchable list — the sheet-mode counterpart to `Picker`'s trigger row. The caller presents
 * this itself (e.g. `sheet.present(({ dismiss }) => <PickerList onSelect={(id) => { onSelect(id);
 * dismiss(); }} .../>)`), so this component has no Sheet dependency and stays in the plain
 * `@lightbridge/ui` barrel.
 *
 * Filters over exactly the `options` it's given — it is the caller's responsibility to pass the
 * *complete* set (not one page of it), otherwise search would silently hide items that were never
 * fetched. This component performs no fetching itself, so it cannot detect that on its own.
 */
export function PickerList({
  options,
  selectedId,
  onSelect,
  searchPlaceholder,
  noResultsLabel,
  title,
  resultCountLabel,
  optionAccessibilityLabel,
}: Readonly<PickerListProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.description?.toLowerCase().includes(needle) ?? false)
    );
  }, [options, query]);

  return (
    <Stack gap="md" width="full">
      {title ? <Text intent="bodyStrong">{title}</Text> : null}
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={searchPlaceholder}
      />
      {resultCountLabel ? <Text intent="caption">{resultCountLabel}</Text> : null}
      <Scroll style={{ maxHeight: 360 }}>
        <Stack gap="xs" width="full">
          {filtered.length === 0 ? (
            <Text intent="caption">{noResultsLabel}</Text>
          ) : (
            filtered.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <ListRow
                  key={option.id}
                  tone={isSelected ? 'muted' : 'transparent'}
                  pad="sm"
                  rounded="md"
                  onPress={() => onSelect(option.id)}
                  accessibilityLabel={optionAccessibilityLabel?.(option) ?? option.label}
                  accessibilityState={{ selected: isSelected }}
                  title={option.label}
                  subtitle={option.description}
                  leading={option.icon}
                  trailing={isSelected ? <Text intent="bodyStrong">✓</Text> : undefined}
                />
              );
            })
          )}
        </Stack>
      </Scroll>
    </Stack>
  );
}
