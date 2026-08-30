import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineManageScreen } from './refine-manage-screen';
import { RefineMockRoot } from './refine-decorator';

describe('RefineManageScreen', () => {
  it('adapts useTable loading/data state into the Manage sections’ props: skeleton while loading, then the live ledger', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [40, 80] }}>
        <RefineManageScreen />
      </RefineMockRoot>,
    );

    // Loading: only the header row renders (LedgerTable's loading state has no `role="row"` data
    // rows, only `role="presentation"` skeleton blocks).
    expect(screen.queryByText('gateway-prod')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1);

    await waitFor(() => expect(screen.getByText('gateway-prod')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('adapts row selection into a DetailSheet hosting ProjectDetail, driven by useTable result data', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [10, 20] }}>
        <RefineManageScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByText('gateway-prod')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]);

    const sheet = await screen.findByRole('dialog', { name: 'gateway-prod' });
    expect(within(sheet).getByText('adorsys-gis')).toBeInTheDocument();
  });

  it('adapts a getList failure into the Manage sections’ error props (ErrorLine + Retry)', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [10, 20], errorResources: { projects: 'Failed to load projects for this account.' } }}>
        <RefineManageScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to load projects for this account.'), {
      timeout: 3000,
    });
  });
});
