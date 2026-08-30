import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RefillOptionsScreen } from './use-refill-options-screen';

/**
 * Container-level acceptance coverage for `/settings/refill-options` (IA v3 phase 3 — the nav row
 * goes live). `useRefillOptionsScreen` is mocked wholesale, matching every other
 * `*-centre.test.tsx` in this app.
 */
const useRefillOptionsScreenMock = vi.fn();
vi.mock('./use-refill-options-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-refill-options-screen')>();
  return {
    ...actual,
    useRefillOptionsScreen: () => useRefillOptionsScreenMock(),
  };
});

function baseScreen(overrides: Partial<RefillOptionsScreen> = {}): RefillOptionsScreen {
  return {
    scopeLabel: 'adorsys-gis',
    ladder: { status: 'ready', amounts: ['+$5.00', '+$12.00'] },
    simulator: {
      ruleDataJson: '{"rules":[]}',
      onRuleDataJsonChange: vi.fn(),
      scenarioJson: '{}',
      onScenarioJsonChange: vi.fn(),
      requestedAmount: '25.00',
      onRequestedAmountChange: vi.fn(),
      submitting: false,
      canSubmit: true,
      onSubmit: vi.fn(),
    },
    omittedNote:
      'Refill policy rule content has no read API today — only activation and revision-by-id status exist (converse-frontends#368).',
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<RefillOptionsScreen> = {}) {
  useRefillOptionsScreenMock.mockReturnValue(baseScreen(overrides));
  const { RefillOptionsCentre } = await import('./refill-options-centre');
  return render(<RefillOptionsCentre />);
}

describe('RefillOptionsCentre', () => {
  it('renders the real ladder amounts, never a fabricated placeholder', async () => {
    await renderCentre();

    expect(screen.getByText('+$5.00 · +$12.00')).toBeInTheDocument();
  });

  it('renders the honest home-account-only gap for a non-home account ladder', async () => {
    const caption =
      'Budget balance and refill requests are only available for your home account today — see lightbridge-authz#577.';
    await renderCentre({ ladder: { status: 'unavailable', caption } });

    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  it('renders the policy simulator card', async () => {
    await renderCentre();

    expect(screen.getByRole('button', { name: 'Simulate' })).toBeInTheDocument();
  });

  it('names the omitted policy-status/stored-rule-data gap inline, citing the filed issue', async () => {
    await renderCentre();

    expect(screen.getByText(/converse-frontends#368/)).toBeInTheDocument();
  });
});
