import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toggle } from './component';

const meta: Meta<typeof Toggle> = {
  title: 'Forms & actions/Toggle',
  component: Toggle,
};

export default meta;
type Story = StoryObj<typeof Toggle>;

function Controlled(props: Partial<React.ComponentProps<typeof Toggle>>) {
  const [checked, setChecked] = useState(props.checked ?? false);
  return <Toggle {...props} checked={checked} onCheckedChange={setChecked} />;
}

export const Unchecked: Story = {
  render: () => <Controlled label="Per-model breakdown" />,
};

export const Checked: Story = {
  render: () => <Controlled label="Per-model breakdown" checked />,
};

export const Disabled: Story = {
  render: () => <Controlled label="Per-model breakdown" checked disabled />,
};

// No visible label — the row supplying its own external label (e.g. `SettingsRow`) must pass
// `aria-label` instead; there is no third, silently-inaccessible option.
export const NoVisibleLabel: Story = {
  render: () => <Controlled aria-label="Auto-merge on green" />,
};

export const CheckedLight: Story = {
  name: 'Checked — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Controlled label="Per-model breakdown" checked />,
};
