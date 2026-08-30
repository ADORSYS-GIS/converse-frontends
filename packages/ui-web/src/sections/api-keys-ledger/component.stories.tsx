import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { EmptyState } from '../../components/empty-state';
import { ApiKeysLedger } from './component';
import { apiKeysFixture } from './fixtures';
import type { ApiKeyRow, ApiKeysDeleteTarget, ApiKeysRevokeTarget } from './types';

const meta: Meta<typeof ApiKeysLedger> = {
  title: 'Sections/ApiKeysLedger',
  component: ApiKeysLedger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysLedger>;

function Demo({
  keys = apiKeysFixture,
  revokeInitial = null,
  deleteInitial = null,
  isAdmin = true,
  loading = false,
  error,
  toolbarActions,
}: {
  keys?: ApiKeyRow[];
  revokeInitial?: ApiKeysRevokeTarget | null;
  deleteInitial?: ApiKeysDeleteTarget | null;
  isAdmin?: boolean;
  loading?: boolean;
  error?: string;
  toolbarActions?: React.ReactNode;
}) {
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeysDeleteTarget | null>(deleteInitial);

  return (
    <div className="p-6">
      <ApiKeysLedger
        keys={keys}
        loading={loading}
        error={error}
        onRetry={() => {}}
        emptyState={
          <EmptyState
            headline="No API keys in this project"
            explainer="Keys authenticate requests to the Lightbridge API. Each belongs to exactly one project."
            action={
              <Button type="button" variant="primary">
                + New key
              </Button>
            }
          />
        }
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

// Addition D (2026-08-30) — this section no longer carries any secret-reveal concept at all: the
// CREATE one-time secret moved into `CreateApiKeyDialog`'s own second step
// (`components/create-api-key-dialog`), and ROTATE's stays a floor-level `SecretReveal` rendered
// by the CONTAINER as a sibling above the `Card` this section fills (`api-keys-centre.tsx`) — the
// fix for the "card inside a card" bug this section's own `secretReveal` prop used to cause.
export const Populated: Story = { render: () => <Demo /> };

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

// A true empty collection replaces the table with `EmptyState` outright.
export const Empty: Story = { render: () => <Demo keys={[]} /> };

export const Loading: Story = { render: () => <Demo keys={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo keys={[]} error="Failed to load keys for this project." />,
};

// Base tier (<600): the ledger scrolls horizontally inside its own container — the page never
// scrolls sideways.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
