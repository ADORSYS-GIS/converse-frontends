// Page-level acceptance story for API KEYS — sections composed inside `ConsoleShell` with the
// section fixtures, 1:1 against docs/design/console-redesign/api-keys.svg.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../components/button';
import { ConsoleShell } from '../components/console-shell';
import { RailPanel } from '../components/rail-panel';
import { ScopeSelect } from '../components/scope-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { API_KEYS_FILTERS_RAIL_LABEL, ApiKeysFiltersRail } from '../sections/api-keys-filters-rail';
import { apiKeysStatusFilterOptions } from '../sections/api-keys-filters-rail/fixtures';
import { API_KEYS_HYGIENE_RAIL_LABEL, ApiKeysHygieneRail } from '../sections/api-keys-hygiene-rail';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-rail/fixtures';
import {
  API_KEYS_LIFECYCLE_RAIL_LABEL,
  ApiKeysLifecycleRail,
} from '../sections/api-keys-lifecycle-rail';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import {
  apiKeysFixture,
  apiKeysNewSecret,
  apiKeysStatusSummary,
} from '../sections/api-keys-ledger/fixtures';
import type {
  ApiKeyRow,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from '../sections/api-keys-ledger';
import { SCOPE_RAIL_LABEL, ScopeRail } from '../sections/scope-rail';
import {
  scopeAccounts,
  scopeProjects,
  scopeRailFixture,
  scopeSelectValue,
} from '../sections/scope-rail/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import { storyAdminNavItems, storyHeader, storyNavItems } from './shell-fixtures';

interface ApiKeysScreenProps {
  keys?: ApiKeyRow[];
  secretReveal?: ApiKeysSecretReveal | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/api-keys` route perform for real.
function ApiKeysScreen({
  keys = apiKeysFixture,
  secretReveal = null,
  revokeInitial = null,
  loading = false,
  error,
  showAdmin = false,
}: ApiKeysScreenProps) {
  const [secret, setSecret] = useState(secretReveal);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const scopeSelect = (
    <ScopeSelect
      accounts={scopeAccounts}
      projects={scopeProjects}
      value={scopeSelectValue}
      onChange={() => {}}
    />
  );

  const filtersRail = (
    <ApiKeysFiltersRail
      statusOptions={apiKeysStatusFilterOptions}
      statusValue={statusFilterValue}
      onStatusChange={setStatusFilterValue}
      search={search}
      onSearchChange={setSearch}
    />
  );

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{
        items: storyNavItems('api-keys'),
        adminItems: storyAdminNavItems('api-keys'),
        showAdmin,
      }}
      leftSecondary={
        <RailPanel label={SCOPE_RAIL_LABEL}>
          <ScopeRail {...scopeRailFixture} />
        </RailPanel>
      }
      leftSecondaryLabel="Scope"
      rightRail={
        <>
          {/* The rail owns the action that consumes its own parameters (README §10.3). Composed
              from `RailPanel` + `Button` rather than given a section of its own — a single CTA is
              not a zone. */}
          <RailPanel>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={() => setSecret(apiKeysNewSecret)}>
              + New key
            </Button>
          </RailPanel>
          <RailPanel label={SCOPE_RAIL_LABEL}>{scopeSelect}</RailPanel>
          <RailPanel label={API_KEYS_FILTERS_RAIL_LABEL}>{filtersRail}</RailPanel>
          <RailPanel label={API_KEYS_HYGIENE_RAIL_LABEL}>
            <ApiKeysHygieneRail hygiene={apiKeysHygiene} />
          </RailPanel>
          <RailPanel label={API_KEYS_LIFECYCLE_RAIL_LABEL}>
            <ApiKeysLifecycleRail />
          </RailPanel>
        </>
      }>
      <div className="flex flex-col gap-6">
        <ScreenHeading
          title="Api-Keys"
          subline={`${scopeRailFixture.accountLabel} / ${scopeRailFixture.projectLabel}`}
          sublineActions={
            <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label={SCOPE_RAIL_LABEL}>
              {scopeSelect}
            </SectionSheetTrigger>
          }
          actions={
            // New key stays a visible primary in the title row below `lg` — the rail's own copy
            // covers `lg`, so this one is hidden there rather than duplicating the CTA.
            <Button
              type="button"
              variant="primary"
              onClick={() => setSecret(apiKeysNewSecret)}
              className="lg:hidden">
              + New key
            </Button>
          }
        />

        <ApiKeysLedger
          keys={keys}
          loading={loading}
          error={error}
          onRetry={() => {}}
          statusSummary={apiKeysStatusSummary}
          secretReveal={secret}
          onDismissSecret={() => setSecret(null)}
          onRotate={() => {}}
          onDelete={() => {}}
          onRequestRevoke={(row) => setRevokeTarget({ row })}
          revokeTarget={revokeTarget}
          onConfirmRevoke={() => setRevokeTarget(null)}
          onCancelRevoke={() => setRevokeTarget(null)}
          selectedRowKeys={selectedRowKeys}
          onSelectRow={(row) => setSelectedRowKeys([row.id])}
          pagination={{ shown: keys.length, total: 27, hasPrev: false, hasNext: true }}
          toolbarActions={
            <SectionSheetTrigger
              icon="filter"
              triggerLabel="Open filters"
              label={API_KEYS_FILTERS_RAIL_LABEL}>
              {filtersRail}
            </SectionSheetTrigger>
          }
        />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ApiKeysScreen> = {
  title: 'Pages/ApiKeys',
  component: ApiKeysScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysScreen>;

// `lg` (≥1024, the default story viewport). Full page, populated 1:1 against api-keys.svg —
// 11-row ledger, secret strip after create/rotate, inline hygiene status.
export const Populated: Story = {
  render: () => <ApiKeysScreen secretReveal={apiKeysNewSecret} />,
};

// Same data without the SecretReveal strip — the steady state once a secret is dismissed.
export const WithoutSecretStrip: Story = { render: () => <ApiKeysScreen /> };

// Revoke gating flow mid-state: TypedConfirmDialog open, typed value not yet matching the name.
export const RevokeDialogOpen: Story = {
  render: () => <ApiKeysScreen revokeInitial={{ row: apiKeysFixture[0] }} />,
};

// §6 — empty ledger still renders its header row; InlineStatus carries the message.
export const Empty: Story = { render: () => <ApiKeysScreen keys={[]} /> };

export const Loading: Story = { render: () => <ApiKeysScreen keys={[]} loading /> };

export const ErrorState: Story = {
  render: () => <ApiKeysScreen keys={[]} error="Failed to load keys for this project." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <ApiKeysScreen showAdmin />,
};

// `md` tier (600–1024) — no persistent right-rail footer/peek bar. New key is a visible primary
// in the title row; SCOPE via the trigger beside the subtitle; FILTERS via the toolbar trigger.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <ApiKeysScreen secretReveal={apiKeysNewSecret} />,
};

export const MdTierFiltersSheetOpen: Story = {
  name: 'md tier — FILTERS sheet open',
  globals: { viewport: { value: 'md900' } },
  render: () => <ApiKeysScreen secretReveal={apiKeysNewSecret} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open filters' }));

    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument());
  },
};

// Base tier (<600): single column, nav docked as a fixed bottom navigation bar, the key ledger
// scrolls horizontally inside its own container (the page never scrolls sideways).
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <ApiKeysScreen secretReveal={apiKeysNewSecret} />,
};
