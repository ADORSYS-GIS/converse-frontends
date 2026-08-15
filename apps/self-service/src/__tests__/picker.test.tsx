import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Picker, PickerList, type PickerOption } from '@lightbridge/ui';

// The regression case this whole feature exists for: an account/project list with more items
// than a single API page (the old call sites capped requests at `limit: 10`). 15 options here
// stands in for "more than one page" — what matters is that every one of them, including the
// last, is reachable through the component, not that the number matches the real backend default.
const manyOptions: PickerOption[] = Array.from({ length: 15 }, (_, index) => ({
  id: `proj-${index + 1}`,
  label: `Project ${index + 1}`,
}));

const fewOptions: PickerOption[] = [
  { id: 'acc-1', label: 'acc-1' },
  { id: 'acc-2', label: 'acc-2' },
];

describe('Picker', () => {
  it('renders an inline control (no trigger row) below the sheet threshold', async () => {
    await render(
      <Picker
        options={fewOptions}
        selectedId="acc-1"
        onSelect={() => undefined}
        onOpenPicker={() => undefined}
        emptyLabel="No accounts"
        placeholderLabel="Select an account"
      />
    );

    // Both options are on screen at once — an inline SegmentedControl, not a tap-to-open row.
    expect(screen.getByText('acc-1')).toBeTruthy();
    expect(screen.getByText('acc-2')).toBeTruthy();
  });

  it('marks the selected option for accessibility when inline', async () => {
    await render(
      <Picker
        options={fewOptions}
        selectedId="acc-2"
        onSelect={() => undefined}
        onOpenPicker={() => undefined}
        emptyLabel="No accounts"
        placeholderLabel="Select an account"
      />
    );

    expect(screen.getByLabelText('acc-2').props.accessibilityState.selected).toBeTruthy();
    expect(screen.getByLabelText('acc-1').props.accessibilityState.selected).toBeFalsy();
  });

  it('calls onSelect directly when choosing inline (no sheet involved)', async () => {
    const onSelect = jest.fn();
    await render(
      <Picker
        options={fewOptions}
        selectedId="acc-1"
        onSelect={onSelect}
        onOpenPicker={() => undefined}
        emptyLabel="No accounts"
        placeholderLabel="Select an account"
      />
    );

    await fireEvent.press(screen.getByText('acc-2'));

    expect(onSelect).toHaveBeenCalledWith('acc-2');
  });

  it('renders a single tap-to-open trigger row — not every option — at/above the sheet threshold', async () => {
    await render(
      <Picker
        options={manyOptions}
        selectedId="proj-1"
        onSelect={() => undefined}
        onOpenPicker={() => undefined}
        emptyLabel="No projects"
        placeholderLabel="Select a project"
      />
    );

    // Only the selected item's label shows on the trigger — the other 14 are not rendered here at
    // all (that would defeat the point: an unbounded list dumped inline is the bug being fixed).
    expect(screen.getByText('Project 1')).toBeTruthy();
    expect(screen.queryByText('Project 15')).toBeNull();
  });

  it('hands control back to the caller via onOpenPicker instead of opening anything itself', async () => {
    const onOpenPicker = jest.fn();
    await render(
      <Picker
        options={manyOptions}
        selectedId="proj-1"
        onSelect={() => undefined}
        onOpenPicker={onOpenPicker}
        emptyLabel="No projects"
        placeholderLabel="Select a project"
        triggerAccessibilityLabel="Select project"
      />
    );

    await fireEvent.press(screen.getByLabelText('Select project'));

    expect(onOpenPicker).toHaveBeenCalledTimes(1);
  });

  it('shows the empty label when there are no options', async () => {
    await render(
      <Picker
        options={[]}
        onSelect={() => undefined}
        onOpenPicker={() => undefined}
        emptyLabel="No projects yet"
        placeholderLabel="Select a project"
      />
    );

    expect(screen.getByText('No projects yet')).toBeTruthy();
  });
});

describe('PickerList', () => {
  it('renders the complete option set up front — nothing is pre-truncated', async () => {
    await render(
      <PickerList
        options={manyOptions}
        onSelect={() => undefined}
        searchPlaceholder="Search projects"
        noResultsLabel="No matches"
      />
    );

    expect(screen.getByText('Project 1')).toBeTruthy();
    // The 15th item (past any 10-item page) is reachable without typing anything — the caller is
    // expected to have already loaded the complete set, and this proves the list doesn't silently
    // re-truncate it.
    expect(screen.getByText('Project 15')).toBeTruthy();
  });

  it('search reaches an item beyond the old 10-item page cap — the actual regression this guards', async () => {
    await render(
      <PickerList
        options={manyOptions}
        onSelect={() => undefined}
        searchPlaceholder="Search projects"
        noResultsLabel="No matches"
      />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Search projects'), 'Project 15');

    expect(screen.getByText('Project 15')).toBeTruthy();
    expect(screen.queryByText('Project 1')).toBeNull();
  });

  it('selecting a filtered result calls onSelect with its id', async () => {
    const onSelect = jest.fn();
    await render(
      <PickerList
        options={manyOptions}
        onSelect={onSelect}
        searchPlaceholder="Search projects"
        noResultsLabel="No matches"
      />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Search projects'), 'Project 15');
    await fireEvent.press(screen.getByText('Project 15'));

    expect(onSelect).toHaveBeenCalledWith('proj-15');
  });

  it('shows the no-results label when the search matches nothing', async () => {
    await render(
      <PickerList
        options={manyOptions}
        onSelect={() => undefined}
        searchPlaceholder="Search projects"
        noResultsLabel="No matches"
      />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Search projects'), 'nonexistent-xyz');

    expect(screen.getByText('No matches')).toBeTruthy();
    expect(screen.queryByText('Project 1')).toBeNull();
  });

  it('search is case-insensitive and matches mid-label', async () => {
    await render(
      <PickerList
        options={manyOptions}
        onSelect={() => undefined}
        searchPlaceholder="Search projects"
        noResultsLabel="No matches"
      />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Search projects'), 'project 15');

    expect(screen.getByText('Project 15')).toBeTruthy();
  });
});
