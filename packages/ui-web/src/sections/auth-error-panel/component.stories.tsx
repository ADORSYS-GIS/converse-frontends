import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuthErrorPanel } from './component';
import { authErrorPanelRetryHref } from './fixtures';

const meta: Meta<typeof AuthErrorPanel> = {
  title: 'Sections/Auth/AuthErrorPanel',
  component: AuthErrorPanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthErrorPanel>;

export const Default: Story = {};

export const WithRetryLink: Story = {
  args: { retryHref: authErrorPanelRetryHref },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  name: 'Default — mobile base tier',
  globals: { viewport: { value: 'base390' } },
};
