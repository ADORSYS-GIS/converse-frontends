import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RefineManageScreen } from './refine-manage-screen';
import { RefineMockRoot } from './refine-decorator';

describe('RefineManageScreen', () => {
  // `useIsBelowLg` (used by `ManagePage` to gate the selection-driven, compact-tier SELECTION
  // sheet — see that hook's own docstring) defaults to "assume below lg" when `matchMedia` is
  // unavailable, which jsdom doesn't implement here. Simulate `lg` so row selection only
  // retargets the persistent inline rail, not also a second copy inside an auto-opened sheet.
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    // @ts-expect-error - restore jsdom's own "matchMedia does not exist" baseline.
    delete window.matchMedia;
  });

  it('adapts useTable loading/data state into ManagePage props: skeleton while loading, then the live ledger', async () => {
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

  it('adapts row selection into the SELECTION rail panel, driven by useTable result data', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [10, 20] }}>
        <RefineManageScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByText('gateway-prod')).toBeInTheDocument());
    expect(screen.getByText('No rows selected.')).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]);

    await waitFor(() => expect(screen.queryByText('No rows selected.')).not.toBeInTheDocument());
    const selectionPanel = screen.getByText('SELECTION').parentElement as HTMLElement;
    expect(within(selectionPanel).getByText('adorsys-gis')).toBeInTheDocument();
  });

  it('adapts a getList failure into ManagePage error props (ErrorLine + Retry)', async () => {
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
