import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleHeader } from '../console-header';
import type { NavSpineItem } from '../nav-spine';
import { RailPanel } from '../rail-panel';
import { ConsoleShell } from './component';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

const navItems: NavSpineItem[] = [
  { key: 'overview', label: 'Overview', icon: <Glyph />, active: true },
  { key: 'api-keys', label: 'Api-Keys', icon: <Glyph /> },
  { key: 'manage', label: 'Manage', icon: <Glyph /> },
];
const adminItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin', icon: <Glyph /> }];

const identity = (
  <div className="flex items-center gap-3">
    <span className="hidden font-mono text-[11px] text-subtle md:inline">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);

const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;

const statCard = (label: string, value: string) => (
  <div className="w-full shrink-0 rounded-[2px] bg-surface p-4 md:w-[209px]">
    <div className="mb-4 font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
      {label}
    </div>
    <div className="font-mono text-2xl text-ink">{value}</div>
  </div>
);

const scopePanel = (
  <RailPanel label="Scope">
    <div className="space-y-3">
      <div>
        <div className="font-mono text-[10px] text-subtle">Account</div>
        <div className="font-mono text-xs text-ink">adorsys-gis</div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-subtle">Project</div>
        <div className="font-mono text-xs text-ink">all projects</div>
      </div>
    </div>
  </RailPanel>
);

const rightRailContent = (
  <RailPanel label="View">
    <div className="space-y-3">
      <div>
        <div className="mb-1 font-mono text-[10px] text-subtle">Range</div>
        <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-xs text-soft">
          Last 30 days
        </div>
      </div>
      <div>
        <div className="mb-1 font-mono text-[10px] text-subtle">Bucket</div>
        <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-xs text-soft">
          Daily
        </div>
      </div>
    </div>
  </RailPanel>
);

function Shell({ showAdmin }: { showAdmin: boolean }) {
  return (
    <ConsoleShell
      header={<ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />}
      nav={{ items: navItems, adminItems, showAdmin }}
      leftSecondary={scopePanel}
      leftSecondaryLabel="Scope"
      rightRail={rightRailContent}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-mono text-[22px] text-ink">Overview</h1>
          <p className="font-sans text-[11px] text-subtle">adorsys-gis · last 30 days · UTC</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          {statCard('Spend this month', '$142.55')}
          {statCard('Active projects', '6')}
          {statCard('Active API keys', '23')}
        </div>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ConsoleShell> = {
  title: 'Shell/ConsoleShell',
  component: ConsoleShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConsoleShell>;

// Full shell at `lg` (1440, the default viewport — see .storybook/preview.tsx), member view (no
// Admin group) — visually comparable to overview.svg. Both rails are sticky (`top-[56px]`,
// independently scrollable); the centre is the only stretching zone (`flex-1 min-w-0`).
export const FullShellMember: Story = {
  render: () => <Shell showAdmin={false} />,
};

// Same composition with the Admin group visible (lightbridge-admin grant).
export const FullShellAdmin: Story = {
  render: () => <Shell showAdmin />,
};

// `md` tier (600–1024): the left rail persists inline; the right rail has NO shell-owned
// fallback at all (owner revision 2026-08-25 — no persistent footer/peek bar at this tier). This
// bare `ConsoleShell` story has no page-level content to place contextual triggers in, so its
// right rail is simply not reachable here below `lg` — see each page story's own md-tier variant
// (`Pages/Overview`, `Pages/ApiKeys`, …) for the real contextual-trigger + `SectionSheet` pattern.
export const MdTierNoRightRailFallback: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <Shell showAdmin={false} />,
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): single column,
// nav spine docked as a fixed bottom navigation bar, left-rail SCOPE panel reachable via the
// header's drawer trigger. Same right-rail caveat as `MdTierNoRightRailFallback`.
export const MobileBottomNav: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Shell showAdmin={false} />,
};
