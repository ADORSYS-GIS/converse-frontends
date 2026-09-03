// Page-level story for `/settings/info` — "what am I running, what am I talking to, who am I".
//
// It exists because of the owner's 2026-09-03 directive ("/settings/info can be done in smaller
// panels in a Grid"): the screen was four full-width cards stacked down one column, and the thing
// that changed is a LAYOUT, which is exactly the kind of change a unit test cannot certify. There
// was no page story for this screen at all before — only `Sections/BuildInfoCard` in isolation.
//
// It mirrors `apps/console/src/containers/info-centre.tsx`'s composition: `PageHeader`, then a
// `DashboardGrid` of Platform (full width) · Backend configuration | Session · Client state (full
// width). The grid has no `dense` flow, so that order is also what fills every row with no holes —
// see the container's own doc comment for why each card spans what it does.
//
// The copy is English literals here rather than the console's `settings` bundle, for the same
// reason every other page story in this directory restates its own: `packages/ui-web` owns no
// translations (ADR 0017 D3) and importing `apps/console` CODE would invert the package dependency
// direction. `Pages/I18n Deutsch` is the story that certifies the German reading of the shell.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { SelectField } from '../components/select-field';
import { SettingsRow } from '../components/settings-row';
import { BuildInfoCard } from '../sections/build-info-card';
import type { BuildInfoCardProps } from '../sections/build-info-card';
import {
  buildInfoAllKnown,
  buildInfoPartiallyUnavailable,
} from '../sections/build-info-card/fixtures';
import { DashboardGrid } from '../sections/dashboard-grid';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

/** The same literal, hardcoded same-origin proxy paths `InfoCentre` prints — never the backend
 *  ORIGINS behind them, which are deliberately not this screen's business. */
const BASE_PATHS = { backend: '/api', budget: '/api/budget', usage: '/api/usage' };

/**
 * The second mount of the language control (ADR 0017), in `/settings/info`'s "Client state" card
 * — a live `SelectField`, not a printed value, for the same reason the theme row above it is not
 * a read-only string either. The console's own is `apps/console/src/i18n/locale-switcher.tsx`.
 */
function StoryLocaleSwitcher() {
  const [locale, setLocale] = useState('en');
  return (
    <SelectField
      label="Language"
      hideLabel
      layout="inline"
      options={[
        { value: 'en', label: 'English' },
        { value: 'de', label: 'Deutsch' },
      ]}
      value={locale}
      onChange={setLocale}
    />
  );
}

function InfoScreen({
  build = buildInfoAllKnown,
  usageConfigured = true,
  online = true,
}: {
  build?: BuildInfoCardProps;
  /** `false` is the honest "this deployment has no usage backend" reading — a muted sentence in
   *  place of a path, never a path the console does not actually call. */
  usageConfigured?: boolean;
  online?: boolean;
}) {
  return (
    <ConsoleShell sidebar={storySidebar('settings')} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Info" subtitle="Build, configuration and session diagnostics" />

        <DashboardGrid>
          {/* `data-span` goes on a wrapper because `dashboard-grid`'s rule targets the DIRECT
              child, and `BuildInfoCard` renders its own `Card` while forwarding only `className`
              — the same wrapper `InfoCentre` uses. */}
          <div data-span="2">
            <BuildInfoCard entries={build.entries} caption={build.caption} />
          </div>

          <Card title="Backend configuration">
            <div className="settings-list">
              <SettingsRow label="Backend API path" value={BASE_PATHS.backend} valueKind="data" />
              <SettingsRow label="Budget API path" value={BASE_PATHS.budget} valueKind="data" />
              <SettingsRow
                label="Usage backend"
                value={usageConfigured ? BASE_PATHS.usage : 'Not configured'}
                valueKind={usageConfigured ? 'data' : 'text'}
                valueMuted={!usageConfigured}
              />
            </div>
          </Card>

          <Card title="Session">
            <div className="settings-list">
              <SettingsRow label="Signed in as" value="sam.lambou@adorsys.com" />
              <SettingsRow
                label="Subject"
                value="49534505-4c60-4550-83dd-7af22152cec6"
                valueKind="data"
              />
              <SettingsRow label="Roles" value="lightbridge-admin, lightbridge-viewer" />
            </div>
          </Card>

          <Card title="Client state" data-span="2">
            <div className="settings-list">
              <SettingsRow label="Theme preference" value="black" />
              <SettingsRow label="Active theme" value="black" />
              <SettingsRow label="Language" value={<StoryLocaleSwitcher />} />
              <SettingsRow
                label="Connectivity"
                value={online ? 'Online' : 'Offline · cached data'}
              />
            </div>
          </Card>
        </DashboardGrid>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/SettingsInfo',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <InfoScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <InfoScreen />,
  globals: { theme: 'wireframe' },
};

/** The state the Platform card exists for — one service still answering, one not deployed here,
 *  one reporting the backend's own `unknown` sentinel. The grid keeps its shape around it. */
export const PartiallyUnavailable: Story = {
  render: () => <InfoScreen build={buildInfoPartiallyUnavailable} usageConfigured={false} />,
};

export const MobileBaseTier: Story = {
  render: () => <InfoScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <InfoScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
