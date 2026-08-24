import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { RefineApiKeysScreen } from './refine-api-keys-screen';
import { withRefineMock } from './refine-decorator';

// `useTable` over the `api-keys` resource — console-ui skill "Refine-driven mock screens".
const meta: Meta<typeof RefineApiKeysScreen> = {
  title: 'Refine/ApiKeys',
  component: RefineApiKeysScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RefineApiKeysScreen>;

// `useTable` loads (LedgerTable skeleton), then the 11-row ledger renders from the mock provider.
export const Populated: Story = {
  decorators: [withRefineMock({ latencyMs: [300, 600] })],
  render: () => (
    <div className="w-[1440px]">
      <RefineApiKeysScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('ci-deploy')).toBeInTheDocument(), { timeout: 3000 });
  },
};

// Confirming a Revoke goes through `useUpdate` against the mock provider — the row's STATUS cell
// flips from "active" to "revoked" once the mutation resolves. The interaction flow named in the
// task ("revoke a key -> status changes").
export const RevokeFlow: Story = {
  decorators: [withRefineMock({ latencyMs: [10, 20] })],
  render: () => (
    <div className="w-[1440px]">
      <RefineApiKeysScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('ci-deploy')).toBeInTheDocument(), { timeout: 3000 });

    const rows = canvas.getAllByRole('row').slice(1);
    const ciDeployRow = rows[0];
    await within(ciDeployRow).findByRole('button', { name: 'Revoke' });
    await userEvent.click(within(ciDeployRow).getByRole('button', { name: 'Revoke' }));

    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.type(within(dialog).getByLabelText('Type "ci-deploy" to confirm'), 'ci-deploy');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Revoke' })).toBeEnabled());
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(canvas.queryByRole('alertdialog')).not.toBeInTheDocument(), { timeout: 3000 });
    await waitFor(
      () => expect(within(canvas.getAllByRole('row')[1]).getByText('revoked')).toBeInTheDocument(),
      { timeout: 3000 },
    );
  },
};

// The `api-keys` resource rejects every `getList` call — `ErrorLine` + Retry renders in place of
// the ledger, matching the fixture-driven `Pages/ApiKeysPage`'s `ErrorState` story.
export const ErrorMode: Story = {
  decorators: [withRefineMock({ latencyMs: [10, 20], errorResources: { 'api-keys': 'Failed to load keys for this project.' } })],
  render: () => (
    <div className="w-[1440px]">
      <RefineApiKeysScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('alert')).toHaveTextContent('Failed to load keys for this project.'), {
      timeout: 3000,
    });
  },
};
