import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Picker, PickerList } from './component';
import type { PickerOption } from './types';

const fewOptions: PickerOption[] = [
  { id: 'acc-1', label: 'acc-1' },
  { id: 'acc-2', label: 'acc-2' },
];

const manyOptions: PickerOption[] = Array.from({ length: 24 }, (_, index) => ({
  id: `proj-${index + 1}`,
  label: `Project ${index + 1}`,
}));

const meta: Meta<typeof Picker> = {
  title: 'UI/Picker',
  component: Picker,
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Picker>;

// `render:` needs a real (capitalized) component function, not an inline arrow, so the
// `useState` inside satisfies react-hooks/rules-of-hooks.
function InlineBelowThresholdStory() {
  const [selectedId, setSelectedId] = useState(fewOptions[0]?.id);
  return (
    <Picker
      options={fewOptions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onOpenPicker={() => {}}
      emptyLabel="No accounts"
      placeholderLabel="Select an account"
    />
  );
}

export const InlineBelowThreshold: Story = {
  render: () => <InlineBelowThresholdStory />,
};

function TriggerAtThresholdStory() {
  const [selectedId, setSelectedId] = useState(manyOptions[0]?.id);
  return (
    <Picker
      options={manyOptions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onOpenPicker={() => alert('Present the sheet — the app owns this call.')}
      emptyLabel="No projects"
      placeholderLabel="Select a project"
      triggerAccessibilityLabel="Select project"
    />
  );
}

export const TriggerAtThreshold: Story = {
  render: () => <TriggerAtThresholdStory />,
};

export const Empty: Story = {
  args: {
    options: [],
    onSelect: () => {},
    onOpenPicker: () => {},
    emptyLabel: 'No projects yet',
    placeholderLabel: 'Select a project',
  },
};

export const Loading: Story = {
  args: {
    options: [],
    onSelect: () => {},
    onOpenPicker: () => {},
    emptyLabel: 'No projects yet',
    placeholderLabel: 'Select a project',
    isLoading: true,
  },
};

// PickerList is the sheet-mode counterpart the app presents via `sheet.present(...)` once
// `Picker` calls `onOpenPicker` — demoed here inline (not as a real sheet) since Storybook has no
// SheetProvider host.
function SheetContentStory() {
  const [selectedId, setSelectedId] = useState(manyOptions[0]?.id);
  return (
    <PickerList
      options={manyOptions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      searchPlaceholder="Search projects"
      noResultsLabel="No matching projects"
      title="Select project"
      resultCountLabel={`${manyOptions.length} projects`}
    />
  );
}

export const SheetContent: Story = {
  render: () => <SheetContentStory />,
};
