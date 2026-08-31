import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommandPaletteTrigger } from '../command-palette';
import { ConsoleTopBar } from './component';

// Same mark `console-chrome.tsx`'s real `BRAND` renders (owner findings, 2026-08-31: the logo is
// a link to `/`, and once a logo renders the `Lightbridge` wordmark text is dropped — an
// `aria-label` on the link carries the accessible name instead).
const brand = (
  <a href="/" aria-label="Lightbridge — go to console home" className="header-brand focus-ring">
    <span className="header-logo" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
  </a>
);

const workspaceSwitcher = (
  <span className="identity-row">
    <span className="section-title text-ink font-sans text-[13px]">adorsys-gis</span>
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
