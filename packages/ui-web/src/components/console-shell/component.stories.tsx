import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../bottom-sheet';
import { ConsoleHeader } from '../console-header';
import { NavSpine, type NavSpineItem } from '../nav-spine';
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
    <span className="font-mono text-[11px] text-subtle">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);

const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;

const statCard = (label: string, value: string) => (
  <div className="w-[209px] rounded-[2px] bg-surface p-4">
    <div className="mb-4 font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
      {label}
    </div>
    <div className="font-mono text-2xl text-ink">{value}</div>
  </div>
);

const scopePanel = (
  <RailPanel label="SCOPE">
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
  <RailPanel label="VIEW">
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

function FullShell({ showAdmin }: { showAdmin: boolean }) {
  return (
    <ConsoleShell
      tier="full"
      header={<ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />}
      leftRail={
        <>
          <RailPanel>
            <NavSpine items={navItems} adminItems={adminItems} showAdmin={showAdmin} />
          </RailPanel>
          {scopePanel}
        </>
      }
      rightRail={rightRailContent}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-mono text-[22px] text-ink">Overview</h1>
          <p className="font-sans text-[11px] text-subtle">
            adorsys-gis · last 30 days · UTC
          </p>
        </div>
        <div className="flex gap-3">
          {statCard('SPEND THIS MONTH', '$142.55')}
          {statCard('ACTIVE PROJECTS', '6')}
          {statCard('ACTIVE API KEYS', '23')}
        </div>
      </div>
    </ConsoleShell>
  );
}

function CompactShellWithBottomSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="relative">
      <ConsoleShell
        tier="compact"
        header={<ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />}
        leftRail={
          <RailPanel>
            <NavSpine items={navItems} adminItems={adminItems} showAdmin />
          </RailPanel>
        }
        rightRail={rightRailContent}
      >
        <div className="space-y-6 pb-40">
          <div>
            <h1 className="font-mono text-lg text-ink">Overview</h1>
            <p className="font-sans text-[10px] text-subtle">
              adorsys-gis · last 30 days · UTC
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {statCard('SPEND THIS MONTH', '$142.55')}
            {statCard('ACTIVE API KEYS', '23')}
          </div>
        </div>
      </ConsoleShell>
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="VIEW & FILTERS"
        peek={
          <div className="font-mono text-[10px] text-subtle">
            Last 30 days · Daily · Project × Model
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 font-mono text-[9px] text-subtle">Range</div>
            <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-[11px] text-soft">
              Last 30 days
            </div>
          </div>
          <div>
            <div className="mb-1 font-mono text-[9px] text-subtle">Bucket</div>
            <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-[11px] text-soft">
              Daily
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

const meta: Meta<typeof ConsoleShell> = {
  title: 'Shell/ConsoleShell',
  component: ConsoleShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConsoleShell>;

// Composed acceptance story: full shell at 1440, member view (no Admin group).
// Visually comparable to docs/design/console-redesign/overview.svg.
export const FullShellMember: Story = {
  render: () => (
    <div className="w-[1440px]">
      <FullShell showAdmin={false} />
    </div>
  ),
};

// Same composition with the Admin group visible (lightbridge-admin grant).
export const FullShellAdmin: Story = {
  render: () => (
    <div className="w-[1440px]">
      <FullShell showAdmin />
    </div>
  ),
};

// Composed acceptance story: compact tier with the right rail docked as a BottomSheet.
// Visually comparable to docs/design/console-redesign/shell-compact.svg.
export const CompactWithBottomSheet: Story = {
  render: () => (
    <div className="w-[900px]">
      <CompactShellWithBottomSheet />
    </div>
  ),
};
