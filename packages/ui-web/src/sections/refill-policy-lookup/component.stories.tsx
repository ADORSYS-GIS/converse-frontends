import type { Meta, StoryObj } from '@storybook/react-vite';

import { RefillPolicyLookup } from './component';
import {
  refillPolicyLookupEmpty,
  refillPolicyLookupError,
  refillPolicyLookupLoading,
  refillPolicyLookupReady,
} from './fixtures';

const meta: Meta<typeof RefillPolicyLookup> = {
  title: 'Sections/Admin/RefillPolicyLookup',
  component: RefillPolicyLookup,
  parameters: { layout: 'fullscreen' },
  args: refillPolicyLookupReady,
  decorators: [
    (Story) => (
      <div className="max-w-[640px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RefillPolicyLookup>;

export const Ready: Story = {};

export const ReadyLight: Story = {
  name: 'Ready — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Empty: Story = { args: refillPolicyLookupEmpty };

export const Loading: Story = { args: refillPolicyLookupLoading };

export const ErrorState: Story = { args: refillPolicyLookupError };
