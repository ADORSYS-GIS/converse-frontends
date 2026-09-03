import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { MutationFailureBanner } from './component';

const meta: Meta<typeof MutationFailureBanner> = {
  title: 'Primitives/States/MutationFailureBanner',
  component: MutationFailureBanner,
};

export default meta;
type Story = StoryObj<typeof MutationFailureBanner>;

// converse-frontends#323: mounted inside `ConsoleShell`'s own sticky chrome band, directly under
// the header — the demo below reproduces that band (`bg-chrome`) rather than the bare component
// on the story canvas background, so the "sits in chrome, not a floating panel" contract is
// visible.
export const Default: Story = {
  render: (args) => (
    <div className="bg-chrome w-[600px]">
      <MutationFailureBanner {...args} />
    </div>
  ),
  args: {
    message: 'RPC call failed with code internal (status 500): the server returned an error.',
    onDismiss: () => {},
  },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: Default.render,
  args: Default.args,
};

export const NoActiveFailure: Story = {
  name: 'No active failure — renders nothing',
  render: (args) => (
    <div className="bg-chrome text-subtle w-[600px] p-2 font-mono text-[10px]">
      (nothing rendered below this line)
      <MutationFailureBanner {...args} />
    </div>
  ),
  args: { message: undefined, onDismiss: () => {} },
};
