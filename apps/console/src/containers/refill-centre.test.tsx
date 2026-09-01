import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RefillScreen } from './use-refill-screen';

/**
 * Container-level acceptance coverage for `/settings/accounts/<id>/request-refill` (IA v3 phase 3 — refill moved
 * from `RequestRefillDialog` to its own page). `useRefillScreen` is mocked wholesale, matching
 * every other `*-centre.test.tsx` in this app.
 */
const useRefillScreenMock = vi.fn();
vi.mock('./use-refill-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-refill-screen')>();
  return {
    ...actual,
    useRefillScreen: () => useRefillScreenMock(),
  };
});

function baseScreen(overrides: Partial<RefillScreen> = {}): RefillScreen {
  return {
    accountId: 'acct_1',
    accountLabel: 'adorsys-gis',
    periodLabel: '2026-08',
    projectLabel: undefined,
    form: {
      status: 'ready',
      amountOptions: [{ value: '5000000', label: '+$5.00' }],
      amountMicros: '5000000',
      onAmountChange: vi.fn(),
      submitting: false,
      canSubmit: true,
      onSubmit: vi.fn(),
    },
    history: { status: 'ready', rows: [] },
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<RefillScreen> = {}) {
  useRefillScreenMock.mockReturnValue(baseScreen(overrides));
  const { RefillCentre } = await import('./refill-centre');
  return render(<RefillCentre />);
}

describe('RefillCentre', () => {
  it('states the account and current period in the subtitle when no project is scoped', async () => {
    await renderCentre();

    expect(screen.getByText('adorsys-gis · 2026-08')).toBeInTheDocument();
  });

  it('states the scoped project too when ?project= is present', async () => {
    await renderCentre({ projectLabel: 'gateway-prod' });

    expect(screen.getByText('adorsys-gis · gateway-prod · 2026-08')).toBeInTheDocument();
  });

  it('renders the amount-choice form', async () => {
    await renderCentre();

    expect(screen.getByRole('button', { name: 'Request refill' })).toBeInTheDocument();
  });

  it('renders the honest home-account-only gap on both cards for a non-home account, never a fabricated ladder or history', async () => {
    const caption =
      'Budget balance and refill requests are only available for your home account today — see lightbridge-authz#577.';
    await renderCentre({
      form: { status: 'unavailable', caption },
      history: { status: 'unavailable', caption },
    });

    expect(screen.getAllByText(caption)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Request refill' })).not.toBeInTheDocument();
  });

  it('renders the caller\'s own history rows', async () => {
    await renderCentre({
      history: {
        status: 'ready',
        rows: [{ id: 'req_1', submittedAgo: '2 days ago', amount: 12, statusLabel: 'Pending review' }],
      },
    });

    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });
});
