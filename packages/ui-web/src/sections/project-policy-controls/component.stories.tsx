import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProjectPolicyControls } from './component';
import { modelCatalogFixture } from './fixtures';

const meta: Meta<typeof ProjectPolicyControls> = {
  title: 'Sections/ProjectPolicyControls',
  component: ProjectPolicyControls,
  parameters: { layout: 'padded' },
  args: {
    modelPolicy: 'allow_all',
    onModelPolicyChange: () => {},
    allowedModels: [],
    onAllowedModelsChange: () => {},
    catalog: modelCatalogFixture,
  },
};

export default meta;
type Story = StoryObj<typeof ProjectPolicyControls>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const AllowlistWithSelection: Story = {
  args: {
    modelPolicy: 'allowlist',
    allowedModels: ['gpt-4o', 'claude-opus-5'],
  },
};

export const AllowlistBlockedEmpty: Story = {
  name: 'Allowlist blocked — no models chosen yet',
  args: { modelPolicy: 'allow_all', allowedModels: [] },
};

export const CatalogLoading: Story = {
  args: { catalog: [], catalogLoading: true },
};

export const CatalogEmpty: Story = {
  args: { catalog: [] },
};

export const CatalogError: Story = {
  args: { catalog: [], catalogError: 'Could not load the model catalogue.' },
};

export const PolicySaveError: Story = {
  args: {
    modelPolicy: 'allow_all',
    allowedModels: [],
    policyError: 'Choose at least one allowed model before switching to allowlist-only.',
  },
};

export const AllowedModelsSaving: Story = {
  args: { allowedModelsSaving: true, allowedModels: ['gpt-4o'] },
};

export const Interactive: Story = {
  render: function Render(args) {
    // Storybook-only local state standing in for the app's own mutation state.
    const [modelPolicy, setModelPolicy] = useState('allow_all');
    const [allowedModels, setAllowedModels] = useState<string[]>([]);
    return (
      <ProjectPolicyControls
        {...args}
        modelPolicy={modelPolicy}
        onModelPolicyChange={setModelPolicy}
        allowedModels={allowedModels}
        onAllowedModelsChange={setAllowedModels}
      />
    );
  },
};
