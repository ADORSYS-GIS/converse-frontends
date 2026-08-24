import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../../components/bottom-sheet';
import { ConsoleHeader } from '../../components/console-header';
import { Field } from '../../components/field';
import { fieldControlVariants, fieldLabelClassName } from '../../components/field/cva';
import { SegmentedControl } from '../../components/segmented-control';
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
    <span className="font-mono text-[11px] text-subtle">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);
const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;
const header = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
const nav = { items: apiKeysNavItems, adminItems: apiKeysAdminNavItems, showAdmin: false };

function ScopeSelectStub() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabelClassName}>Account</label>
        <select
          value={apiKeysScopeSelectValue.accountId}
          onChange={() => {}}
          className={fieldControlVariants({ error: false, multiline: false })}
        >
          {apiKeysScopeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabelClassName}>Project</label>
        <select
          value={apiKeysScopeSelectValue.projectId ?? ''}
          onChange={() => {}}
          className={fieldControlVariants({ error: false, multiline: false })}
        >
          {apiKeysScopeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StatefulApiKeysPage({
  secretReveal = null,
  revokeInitial = null,
  keys = apiKeysFixture,
  loading = false,
  error,
  compact = false,
}: {
  secretReveal?: ApiKeysSecretReveal | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  keys?: ApiKeyRow[];
  loading?: boolean;
  error?: string;
  compact?: boolean;
}) {
  const [secret, setSecret] = useState(secretReveal);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const page = (
    <ApiKeysPage
      tier={compact ? 'compact' : 'full'}
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

  if (!compact) return page;

  return (
    <div className="relative">
      {page}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="SCOPE & FILTERS"
        peek={<div className="font-mono text-[10px] text-subtle">{apiKeysScope.projectLabel} · All statuses</div>}
      >
        <div className="grid grid-cols-2 gap-3">
          <ScopeSelectStub />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabelClassName}>Status</span>
              <SegmentedControl
                aria-label="Status filter"
                options={apiKeysStatusFilterOptions}
                value={statusFilterValue}
                onChange={setStatusFilterValue}
              />
            </div>
            <Field label="Search" placeholder="name or prefix…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

const meta: Meta<typeof ApiKeysPage> = {
  title: 'Pages/ApiKeysPage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysPage>;

// Full page, populated 1:1 against docs/design/console-redesign/api-keys.svg — 11-row ledger,
// secret strip after create/rotate, inline hygiene status.
export const Populated: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage secretReveal={apiKeysNewSecret} />
    </div>
  ),
};

// Same data without the SecretReveal strip — the steady-state view once a secret is dismissed.
export const WithoutSecretStrip: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage secretReveal={null} />
    </div>
  ),
};

// Revoke gating flow mid-state: TypedConfirmDialog open, typed value not yet matching the key name.
export const RevokeDialogOpen: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage revokeInitial={{ row: apiKeysFixture[0] }} />
    </div>
  ),
};

// §6 — empty ledger still renders its header row; InlineStatus carries the empty-state message.
export const Empty: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage keys={[]} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage keys={[]} loading />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulApiKeysPage keys={[]} error="Failed to load keys for this project." />
    </div>
  ),
};

// Compact tier (600–1024) — SCOPE/FILTERS dock as a BottomSheet; shell-compact.svg treatment.
export const Compact: Story = {
  render: () => (
    <div className="w-[900px]">
      <StatefulApiKeysPage compact />
    </div>
  ),
};
