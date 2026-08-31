import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { SelectField } from './component';

const meta: Meta<typeof SelectField> = {
  title: 'Forms/SelectField',
  component: SelectField,
};

export default meta;
type Story = StoryObj<typeof SelectField>;

function Demo() {
  const [value, setValue] = useState('last-30');
  return (
    <div className="bg-surface w-[248px] p-4">
      <SelectField
        label="Range"
        value={value}
        options={[
          { value: 'last-7', label: 'Last 7 days' },
          { value: 'last-30', label: 'Last 30 days' },
          { value: 'last-90', label: 'Last 90 days' },
        ]}
        onChange={setValue}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/**
 * Popup open — the "select" half of the overlay-restyle design review (owner ask, 2026-08-31):
 * same row rhythm and floating-overlay radius `CommandPalette` and every other Menu/Select/
 * Combobox/Popover popup now share (`select-field-item`, `OVERLAY_*`, theme.css).
 */
export const Open: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A plain role query, not `{ name: 'Range' }`: the built Storybook's browser-side
    // accessible-name computation does not resolve this trigger's `aria-labelledby` the way
    // jsdom's does in `component.test.tsx` (`getByLabelText('Range')` passes there) -- a
    // pre-existing platform gap between the two a11y-tree implementations, not a component
    // defect. There is exactly one combobox in this story either way.
    await userEvent.click(canvas.getByRole('combobox'));
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Open`.
export const OpenLight: Story = {
  name: 'Open — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A plain role query, not `{ name: 'Range' }`: the built Storybook's browser-side
    // accessible-name computation does not resolve this trigger's `aria-labelledby` the way
    // jsdom's does in `component.test.tsx` (`getByLabelText('Range')` passes there) -- a
    // pre-existing platform gap between the two a11y-tree implementations, not a component
    // defect. There is exactly one combobox in this story either way.
    await userEvent.click(canvas.getByRole('combobox'));
  },
};
