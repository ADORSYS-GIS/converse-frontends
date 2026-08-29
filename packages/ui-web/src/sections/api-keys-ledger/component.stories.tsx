import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
import { ApiKeysLedger } from './component';
import { apiKeysFixture, apiKeysNewSecret, apiKeysStatusSummary } from './fixtures';
import type { ApiKeyRow, ApiKeysRevokeTarget, ApiKeysSecretReveal } from './types';

const meta: Meta<typeof ApiKeysLedger> = {
  title: 'Sections/ApiKeysLedger',
  component: ApiKeysLedger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysLedger>;

function Demo({
  keys = apiKeysFixture,
  secretReveal = null,
  revokeInitial = null,
  loading = false,
  error,
  toolbarActions,
}: {
  keys?: ApiKeyRow[];
  secretReveal?: ApiKeysSecretReveal | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  loading?: boolean;
  error?: string;
  toolbarActions?: React.ReactNode;
}) {
  const [secret, setSecret] = useState(secretReveal);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);

  return (
    <div className="p-6">
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
        pagination={{ shown: 11, total: 27, hasPrev: false, hasNext: true }}
        toolbarActions={toolbarActions}
      />
    </div>
  );
}

export const Populated: Story = { render: () => <Demo secretReveal={apiKeysNewSecret} /> };

export const WithoutSecretStrip: Story = { render: () => <Demo /> };

export const RevokeDialogOpen: Story = {
  render: () => <Demo revokeInitial={{ row: apiKeysFixture[0] }} />,
};

// §6 — the empty ledger still renders its header row; InlineStatus carries the message.
export const Empty: Story = { render: () => <Demo keys={[]} /> };

export const Loading: Story = { render: () => <Demo keys={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo keys={[]} error="Failed to load keys for this project." />,
};

// Compact tier: the FILTERS trigger appears in the toolbar row, beside the status line.
export const MdTierWithTrigger: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => (
    <Demo
      toolbarActions={
        <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
          <p className="font-mono text-xs text-ink">Status · Search</p>
        </SectionSheetTrigger>
      }
    />
  ),
};

// Base tier (<600): the ledger scrolls horizontally inside its own container — the page never
// scrolls sideways.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo secretReveal={apiKeysNewSecret} />,
};
