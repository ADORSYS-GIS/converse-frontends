import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommandPaletteTrigger } from '../command-palette';
import { ConsoleTopBar } from './component';

const brand = (
  <>
    <span className="header-logo" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
    <span className="header-wordmark">Lightbridge</span>
  </>
);

const workspaceSwitcher = (
  <span className="identity-row">
    <span className="section-title font-sans text-[13px] text-ink">adorsys-gis</span>
  </span>
);

const identity = (
  <span aria-hidden="true" className="avatar-chip">
    SL
  </span>
);

const meta: Meta<typeof ConsoleTopBar> = {
  title: 'Shell/ConsoleTopBar',
  component: ConsoleTopBar,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'base390' } },
};

export default meta;
type Story = StoryObj<typeof ConsoleTopBar>;

export const Default: Story = {
  args: { brand, workspaceSwitcher, identity },
};

export const WithPaletteTrigger: Story = {
  args: {
    brand,
    workspaceSwitcher,
    paletteTrigger: <CommandPaletteTrigger onClick={() => {}} />,
    identity,
  },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe', viewport: { value: 'base390' } },
  args: Default.args,
};
