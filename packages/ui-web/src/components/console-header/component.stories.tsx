import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleHeader } from './component';

const identity = (
  <div className="flex items-center gap-3">
    <span className="font-mono text-[11px] text-subtle">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);

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
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" rx="2" fill="#DA5C2C"/></svg>',
      ),
    logoAlt: 'Acme Corp',
    orgSwitcher,
    identity,
  },
};

export const NoOrgSwitcher: Story = { args: { identity } };
