import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleHeader } from '../../components/console-header';
import { ApiKeysPage } from './component';
import {
  apiKeysAdminNavItems,
  apiKeysFixture,
  apiKeysHygiene,
  apiKeysNavItems,
  apiKeysNewSecret,
  apiKeysScope,
  apiKeysScopeAccounts,
  apiKeysScopeProjects,
  apiKeysScopeSelectValue,
  apiKeysStatusFilterOptions,
  apiKeysStatusSummary,
} from './fixtures';
import type { ApiKeyRow, ApiKeysRevokeTarget, ApiKeysSecretReveal } from './types';

const identity = (
  <div className="flex items-center gap-3">
    <span className="hidden font-mono text-[11px] text-subtle md:inline">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);
const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;
const header = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
const nav = { items: apiKeysNavItems, adminItems: apiKeysAdminNavItems, showAdmin: false };

function StatefulApiKeysPage({
  secretReveal = null,
  revokeInitial = null,
  keys = apiKeysFixture,
  loading = false,
  error,
}: {
  secretReveal?: ApiKeysSecretReveal | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  keys?: ApiKeyRow[];
  loading?: boolean;
  error?: string;
}) {
  const [secret, setSecret] = useState(secretReveal);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <ApiKeysPage
      header={header}
      nav={nav}
      scope={apiKeysScope}
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
      onCreateKey={() => setSecret(apiKeysNewSecret)}
      pagination={{ shown: 11, total: 27, hasPrev: false, hasNext: true }}
      scopeSelect={{
        accounts: apiKeysScopeAccounts,
        projects: apiKeysScopeProjects,
        value: apiKeysScopeSelectValue,
        onChange: () => {},
      }}
      statusFilterOptions={apiKeysStatusFilterOptions}
      statusFilterValue={statusFilterValue}
      onStatusFilterChange={setStatusFilterValue}
      search={search}
      onSearchChange={setSearch}
      hygiene={apiKeysHygiene}
    />
  );
}

const meta: Meta<typeof ApiKeysPage> = {
  title: 'Pages/ApiKeysPage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysPage>;

// `lg` (≥1024, the default story viewport). Full page, populated 1:1 against
// docs/design/console-redesign/api-keys.svg — 11-row ledger, secret strip after create/rotate,
// inline hygiene status.
export const Populated: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage secretReveal={apiKeysNewSecret} />
    </div>
  ),
};

// Same data without the SecretReveal strip — the steady-state view once a secret is dismissed.
export const WithoutSecretStrip: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage secretReveal={null} />
    </div>
  ),
};

// Revoke gating flow mid-state: TypedConfirmDialog open, typed value not yet matching the key name.
export const RevokeDialogOpen: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage revokeInitial={{ row: apiKeysFixture[0] }} />
    </div>
  ),
};

// §6 — empty ledger still renders its header row; InlineStatus carries the empty-state message.
export const Empty: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage keys={[]} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage keys={[]} loading />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-full">
      <StatefulApiKeysPage keys={[]} error="Failed to load keys for this project." />
    </div>
  ),
};

// `md` tier (600–1024) — SCOPE/FILTERS/hygiene dock as a BottomSheet; shell-compact.svg
// treatment. A real viewport resize is what exercises the `md:` classes now the shell is
// CSS-tiered, not a wrapper `<div>`.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <StatefulApiKeysPage secretReveal={apiKeysNewSecret} />,
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): single column,
// nav docked as a fixed bottom navigation bar, the key ledger scrolls horizontally inside its
// own container (the page never scrolls sideways), NEW KEY & FILTERS reachable via the right
// rail's BottomSheet peek row, SCOPE reachable via the header's drawer trigger.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <StatefulApiKeysPage secretReveal={apiKeysNewSecret} />,
};
