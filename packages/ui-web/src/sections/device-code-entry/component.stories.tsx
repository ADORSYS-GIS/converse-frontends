import type { Meta, StoryObj } from '@storybook/react-vite';

import { DeviceCodeEntry } from './component';
import {
  deviceCodeEntryAction,
  deviceCodeEntryInvalidCodeMessage,
  deviceCodeEntryPrefilledCode,
} from './fixtures';

const meta: Meta<typeof DeviceCodeEntry> = {
  title: 'Sections/Auth/DeviceCodeEntry',
  component: DeviceCodeEntry,
  parameters: { layout: 'fullscreen' },
  args: { action: deviceCodeEntryAction },
};

export default meta;
type Story = StoryObj<typeof DeviceCodeEntry>;

export const Default: Story = {};

export const Prefilled: Story = {
  name: 'Pre-filled from verification_uri_complete',
  args: { defaultUserCode: deviceCodeEntryPrefilledCode },
};

export const InvalidCode: Story = {
  name: 'Invalid code',
  args: { errorMessage: deviceCodeEntryInvalidCodeMessage },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const InvalidCodeLight: Story = {
  name: 'Invalid code — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { errorMessage: deviceCodeEntryInvalidCodeMessage },
};

export const MobileBaseTier: Story = {
  name: 'Default — mobile base tier',
  globals: { viewport: { value: 'base390' } },
};
