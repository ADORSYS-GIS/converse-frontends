import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RowActionGroup } from './component';

const meta: Meta<typeof RowActionGroup> = {
  title: 'Data display/RowActionGroup',
  component: RowActionGroup,
};

export default meta;
type Story = StoryObj<typeof RowActionGroup>;

// api-keys.svg row lifecycle order: Rotate ╱ Revoke ╱ Del — Revoke is the emphasised default.
export const KeyLifecycle: Story = {
  args: {
    actions: [
      { key: 'rotate', label: 'Rotate', onClick: () => {}, emphasis: 'default' },
      { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong' },
      { key: 'del', label: 'Delete', onClick: () => {}, emphasis: 'muted' },
    ],
  },
};

export const WithDisabledAction: Story = {
  args: {
    actions: [
      { key: 'rotate', label: 'Rotate', onClick: () => {}, emphasis: 'default' },
      { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong', disabled: true },
      { key: 'del', label: 'Delete', onClick: () => {}, emphasis: 'muted' },
    ],
  },
};

export const RevealedOnRowHover: Story = {
  render: () => (
    <div className="group flex h-11 w-[400px] items-center justify-between border-b border-raised bg-surface px-3 hover:bg-chrome">
      <span className="font-mono text-xs text-ink">ci-deploy</span>
      <div className="opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <RowActionGroup
          actions={[
            { key: 'rotate', label: 'Rotate', onClick: () => {}, emphasis: 'default' },
            { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong' },
            { key: 'del', label: 'Delete', onClick: () => {}, emphasis: 'muted' },
          ]}
        />
      </div>
    </div>
  ),
};
