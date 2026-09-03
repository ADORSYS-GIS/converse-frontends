import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ProjectNameDialog } from './component';

const meta: Meta<typeof ProjectNameDialog> = {
  title: 'Primitives/Overlays/ProjectNameDialog',
  component: ProjectNameDialog,
  args: {
    open: true,
    projectId: 'proj_7f21c0a4',
    currentName: 'gateway-prod',
    name: 'gateway-prod',
    onNameChange: fn(),
    submitting: false,
    canSubmit: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProjectNameDialog>;

/** Opened on the current name, so a rename starts from what the project is actually called. */
export const Default: Story = {};

// ADR 0010 phase 4: the `wireframe` (light) counterpart. The dialog portals to `document.body`,
// outside the canvas root the preview decorator wraps, so this also confirms the backdrop and
// panel tokens re-resolve there.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Changed: Story = {
  name: 'Edited — the primary is live once the value actually differs',
  args: { name: 'gateway-edge', canSubmit: true },
};

/**
 * `Project.name` is a plain `String`, not `String?` — blank is not a value the column can hold, so
 * unlike `AccountNameDialog` (where a blank submit legally clears the name) the primary is simply
 * unavailable here. Pinned as a story because the two dialogs look identical and this is the one
 * place their contracts disagree.
 */
export const BlankIsNotAValue: Story = {
  name: 'Blank name — not submittable, unlike the account dialog',
  args: { name: '   ', canSubmit: false },
};

export const NameRejected: Story = {
  name: 'Validation failure — server rejects the name, surfaced on the field',
  args: { name: 'gateway edge', canSubmit: true, nameError: 'project name must not be blank' },
};

export const SubmitFailed: Story = {
  name: 'Server-rejected submit — kept inline, dialog stays open',
  args: {
    name: 'gateway-edge',
    canSubmit: true,
    error: 'only the account owner or a project member can rename this project',
  },
};

export const Submitting: Story = {
  name: 'In-flight submit',
  args: { name: 'gateway-edge', canSubmit: true, submitting: true },
};
