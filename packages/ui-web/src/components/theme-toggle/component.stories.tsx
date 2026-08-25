import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ThemeToggle } from './component';
import type { ThemeTogglePreference } from './types';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Shell/ThemeToggle',
  component: ThemeToggle,
  args: { onPreferenceChange: fn() },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Dark: Story = { args: { preference: 'black' } };

export const Light: Story = {
  args: { preference: 'wireframe' },
  globals: { theme: 'wireframe' },
};

export const SystemPreference: Story = {
  name: 'System',
  args: { preference: 'system' },
};

// The `wireframe` (light) counterpart of each preference -- confirms the glyph reads on the light
// floor and stays a token-coloured stroke, never a hardcoded dark line (console-ui skill: every
// component ships a light story variant).
export const AllPreferencesLight: Story = {
  name: 'All preferences — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <div className="flex items-center gap-2 bg-chrome p-4">
      <ThemeToggle preference="black" onPreferenceChange={fn()} />
      <ThemeToggle preference="wireframe" onPreferenceChange={fn()} />
      <ThemeToggle preference="system" onPreferenceChange={fn()} />
    </div>
  ),
};

export const AllPreferences: Story = {
  name: 'All preferences',
  render: () => (
    <div className="flex items-center gap-2 bg-chrome p-4">
      <ThemeToggle preference="black" onPreferenceChange={fn()} />
      <ThemeToggle preference="wireframe" onPreferenceChange={fn()} />
      <ThemeToggle preference="system" onPreferenceChange={fn()} />
    </div>
  ),
};

// A live, self-contained cycle -- click through it in the Storybook canvas to see the glyph and
// aria-label advance dark -> light -> system -> dark, exactly as the header instance will.
function InteractiveCycle() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  return (
    <div className="flex items-center gap-3 bg-chrome p-4">
      <ThemeToggle preference={preference} onPreferenceChange={setPreference} />
      <span className="font-mono text-xs text-soft">{preference}</span>
    </div>
  );
}

export const InteractiveCycleStory: Story = {
  name: 'Interactive cycle',
  render: () => <InteractiveCycle />,
};
