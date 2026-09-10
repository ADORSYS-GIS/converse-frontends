import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RefillPolicyManual } from './component';

function Controlled({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="max-w-[640px] p-6">
      <RefillPolicyManual open={open} onOpenChange={setOpen} />
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/Admin/RefillPolicyManual',
  component: Controlled,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Closed: Story = { args: { initialOpen: false } };

export const ClosedLight: Story = {
  name: 'Closed — wireframe (light)',
  args: { initialOpen: false },
  globals: { theme: 'wireframe' },
};

export const Open: Story = { args: { initialOpen: true } };

export const OpenLight: Story = {
  name: 'Open — wireframe (light)',
  args: { initialOpen: true },
  globals: { theme: 'wireframe' },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { initialOpen: true },
};
