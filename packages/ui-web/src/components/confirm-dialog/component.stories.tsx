import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ConfirmDialog } from './component';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Primitives/Overlays/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'Replace your draft with the example policy?',
    description:
      'The example policy overwrites every field on this form, including the policy set id. Nothing you have typed here has been saved yet.',
    confirmLabel: 'Replace my draft',
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {};

// The `wireframe` (light) counterpart — the popup portals to `document.body`, outside the canvas
// root the preview decorator wraps, so this is the story that proves the panel re-resolves.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};
