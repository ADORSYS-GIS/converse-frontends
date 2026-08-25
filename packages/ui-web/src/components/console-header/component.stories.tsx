import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountMenu } from '../account-menu';
import { CommandPaletteTrigger } from '../command-palette';
import { ThemeToggle } from '../theme-toggle';
import type { ThemeTogglePreference } from '../theme-toggle';
import { ConsoleHeader } from './component';

// Mobile-first: the email is the first thing to go below `md` (console-ui skill "no overflow,
// ever") — the avatar alone stays a legible trigger at any header width; `AccountMenu` handles
// that itself.
const identity = (
  <AccountMenu name="Sam Lambou" email="sam@adorsys.com" initials="SL" onSignOut={fn()} />
);

// The real `apps/console` identity slot: `ThemeToggle` (the visible quick-cycle) sits beside
// `AccountMenu` (whose Dark/Light/System entries stay, for explicit selection) -- both driven by
// one shared preference so they can never disagree. `useState` here stands in for
// `apps/console`'s `useConsoleTheme`.
function IdentityWithThemeToggle() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  return (
    <div className="flex items-center gap-4">
      <ThemeToggle preference={preference} onPreferenceChange={setPreference} />
      <AccountMenu
        name="Sam Lambou"
        email="sam@adorsys.com"
        initials="SL"
        onSignOut={fn()}
        theme={preference}
        onThemeChange={setPreference}
      />
    </div>
  );
}

const orgSwitcher = (
  <button type="button" className="flex items-center gap-1.5 font-mono text-xs text-soft">
    adorsys-gis
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <path d="M1 3 l3 3 l3 -3" fill="none" stroke="currentColor" />
    </svg>
  </button>
);

const meta: Meta<typeof ConsoleHeader> = {
  title: 'Shell/ConsoleHeader',
  component: ConsoleHeader,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConsoleHeader>;

export const FallbackWordmark: Story = { args: { orgSwitcher, identity } };

export const ConfiguredLogo: Story = {
  args: {
    logoSrc:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" rx="2" fill="#DA5C2C"/></svg>'
      ),
    logoAlt: 'Acme Corp',
    orgSwitcher,
    identity,
  },
};

export const NoOrgSwitcher: Story = { args: { identity } };

export const WithPaletteTrigger: Story = {
  args: {
    orgSwitcher,
    paletteTrigger: <CommandPaletteTrigger onClick={fn()} />,
    identity,
  },
};

export const WithThemeToggle: Story = {
  name: 'With ThemeToggle (real apps/console composition)',
  render: () => (
    <ConsoleHeader
      orgSwitcher={orgSwitcher}
      paletteTrigger={<CommandPaletteTrigger onClick={fn()} />}
      identity={<IdentityWithThemeToggle />}
    />
  ),
};

export const WithThemeToggleLight: Story = {
  name: 'With ThemeToggle — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <ConsoleHeader
      orgSwitcher={orgSwitcher}
      paletteTrigger={<CommandPaletteTrigger onClick={fn()} />}
      identity={<IdentityWithThemeToggle />}
    />
  ),
};
