import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineOverviewScreen } from './refine-overview-screen';
import { RefineMockRoot } from './refine-decorator';

describe('RefineOverviewScreen', () => {
  it('adapts useCustom loading/data state into the Overview sections’ props: skeleton metrics while loading, then the live stat cards', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [40, 80] }}>
        <RefineOverviewScreen />
      </RefineMockRoot>,
    );

    expect(screen.queryByText('$142.55')).not.toBeInTheDocument();

    // "$142.55" alone is ambiguous once loaded — BudgetHero echoes the same figure the SPEND THIS
    // MONTH stat card shows (both fixtures use the same mock number), so assert via `getAllByText`.
    await waitFor(() => expect(screen.getAllByText('$142.55').length).toBeGreaterThan(0), { timeout: 3000 });
    expect(screen.getByText('Spend this month')).toBeInTheDocument();
  });

  it('adapts a custom-endpoint failure into the Overview sections’ error props (ErrorLine per dashboard)', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [10, 20], errorResources: { overview: 'Failed to load overview data.' } }}>
        <RefineOverviewScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getAllByText('Failed to load overview data.').length).toBeGreaterThan(0), {
      timeout: 3000,
    });
  });
});
