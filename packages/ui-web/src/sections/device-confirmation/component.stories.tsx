import type { Meta, StoryObj } from '@storybook/react-vite';

import { DeviceConfirmation } from './component';
import {
  deviceConfirmationAction,
  deviceConfirmationClientName,
  deviceConfirmationErrorMessage,
  deviceConfirmationUserCode,
} from './fixtures';

const meta: Meta<typeof DeviceConfirmation> = {
  title: 'Sections/Auth/DeviceConfirmation',
  component: DeviceConfirmation,
  parameters: { layout: 'fullscreen' },
  args: {
    action: deviceConfirmationAction,
    userCode: deviceConfirmationUserCode,
    clientName: deviceConfirmationClientName,
  },
};

export default meta;
type Story = StoryObj<typeof DeviceConfirmation>;

export const Ready: Story = {};

export const Loading: Story = {
  args: { status: 'loading' },
};

export const Error: Story = {
  args: { status: 'error', errorMessage: deviceConfirmationErrorMessage, backHref: '/device' },
};

export const ReadyLight: Story = {
  name: 'Ready — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  name: 'Ready — mobile base tier',
  globals: { viewport: { value: 'base390' } },
};
