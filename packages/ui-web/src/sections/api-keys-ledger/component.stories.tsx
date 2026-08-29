import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
import { ApiKeysLedger } from './component';
import { apiKeysFixture, apiKeysNewSecret, apiKeysStatusSummary } from './fixtures';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from './types';

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
  deleteInitial = null,
  isAdmin = true,
  loading = false,
  error,
  toolbarActions,
}: {
  keys?: ApiKeyRow[];
  secretReveal?: ApiKeysSecretReveal | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  deleteInitial?: ApiKeysDeleteTarget | null;
  isAdmin?: boolean;
  loading?: boolean;
  error?: string;
  toolbarActions?: React.ReactNode;
}) {
  const [secret, setSecret] = useState(secretReveal);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeysDeleteTarget | null>(deleteInitial);

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
        onRequestRevoke={(row) => setRevokeTarget({ row })}
        revokeTarget={revokeTarget}
        onConfirmRevoke={() => setRevokeTarget(null)}
        onCancelRevoke={() => setRevokeTarget(null)}
        isAdmin={isAdmin}
        onRequestDelete={(row) => setDeleteTarget({ row })}
        deleteTarget={deleteTarget}
        onConfirmDelete={() => setDeleteTarget(null)}
        onCancelDelete={() => setDeleteTarget(null)}
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

// Ticket #321 — `Del` now matches the LIFECYCLE rail's "admin only, behind typed confirmation".
export const DeleteDialogOpen: Story = {
  render: () => <Demo deleteInitial={{ row: apiKeysFixture[0] }} />,
};

export const DeleteDialogOpenLight: Story = {
  name: 'Delete dialog open — wireframe (light)',
  render: () => <Demo deleteInitial={{ row: apiKeysFixture[0] }} />,
  globals: { theme: 'wireframe' },
};

export const DeleteDialogError: Story = {
  name: 'Delete dialog — stays open with an inline error on failure',
  render: () => (
    <Demo
      deleteInitial={{
        row: apiKeysFixture[0],
        error: 'Could not delete the key — the server returned a 500. Nothing changed.',
      }}
    />
  ),
};

// A non-admin sees Rotate and Revoke; `Del` is omitted rather than shown disabled with no
// explanation — the LIFECYCLE rail's own "admin only" copy is the stated reason (console-ui
// skill §states). This is presentation only, not the security boundary (see `isAdmin`'s doc
// comment in `types.ts`).
export const NonAdminNoDeleteAction: Story = {
  name: 'Non-admin — Del is omitted, not disabled',
  render: () => <Demo isAdmin={false} />,
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
