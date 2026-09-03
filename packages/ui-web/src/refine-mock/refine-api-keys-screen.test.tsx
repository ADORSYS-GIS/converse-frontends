import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineApiKeysScreen } from './refine-api-keys-screen';
import { RefineMockRoot } from './refine-decorator';

describe('RefineApiKeysScreen', () => {
  it('adapts useTable loading/data state into the Api-Keys sections’ props: skeleton while loading, then the live ledger', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [40, 80] }}>
        <RefineApiKeysScreen />
      </RefineMockRoot>
    );

    expect(screen.queryByText('ci-deploy')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1);

    await waitFor(() => expect(screen.getByText('ci-deploy')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('revoking a key through the confirm dialog flows through useUpdate and flips its STATUS cell', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [5, 10] }}>
        <RefineApiKeysScreen />
      </RefineMockRoot>
    );

    await waitFor(() => expect(screen.getByText('ci-deploy')).toBeInTheDocument());

    const rows = screen.getAllByRole('row').slice(1);
    const ciDeployRow = rows[0];
    fireEvent.click(within(ciDeployRow).getByRole('button', { name: 'Revoke' }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Type "ci-deploy" to confirm'), {
      target: { value: 'ci-deploy' },
    });
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Revoke' })).toBeEnabled()
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(screen.getAllByRole('row')[1]).getByText('revoked')).toBeInTheDocument()
    );
  });

  it('adapts a getList failure into the Api-Keys sections’ error props (ErrorLine + Retry)', async () => {
    render(
      <RefineMockRoot
        providerConfig={{
          latencyMs: [10, 20],
          errorResources: { 'api-keys': 'Failed to load keys for this project.' },
        }}>
        <RefineApiKeysScreen />
      </RefineMockRoot>
    );

    await waitFor(
      () =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Failed to load keys for this project.'
        ),
      {
        timeout: 3000,
      }
    );
  });
});
