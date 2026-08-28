import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusText } from '../status-text';
import { Toggle } from '../toggle';
import { SettingsRow, SettingsSection } from './component';

const meta: Meta<typeof SettingsSection> = {
  title: 'Data display/SettingsSection',
  component: SettingsSection,
};

export default meta;
type Story = StoryObj<typeof SettingsSection>;

function ReviewBehaviourSection() {
  const [autoMerge, setAutoMerge] = useState(false);
  const [reviewOnPush, setReviewOnPush] = useState(true);

  return (
    <SettingsSection title="Review behaviour">
      <SettingsRow
        label="Review on push"
        description="Run a review automatically on every push to the default branch."
        control={
          <Toggle
            checked={reviewOnPush}
            onCheckedChange={setReviewOnPush}
            aria-label="Review on push"
          />
        }
      />
      <SettingsRow
        label="Auto-merge on green"
        description="Merge the PR once review and CI both pass."
        badge={<StatusText tone="muted">Default</StatusText>}
        control={
          <Toggle
            checked={autoMerge}
            onCheckedChange={setAutoMerge}
            aria-label="Auto-merge on green"
          />
        }
      />
      <SettingsRow
        label="Review tier"
        description="Fast (auto) or deep (on demand)."
        badge={<StatusText tone="attention">Admin override</StatusText>}>
        Fast
      </SettingsRow>
    </SettingsSection>
  );
}

export const Default: Story = {
  render: () => <ReviewBehaviourSection />,
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <ReviewBehaviourSection />,
};
