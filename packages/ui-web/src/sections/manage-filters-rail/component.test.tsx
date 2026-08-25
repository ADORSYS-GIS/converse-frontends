import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageFiltersRail } from './component';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageStatusOptions,
} from './fixtures';
import type { ManageFiltersRailProps } from './types';

function makeProps(overrides: Partial<ManageFiltersRailProps> = {}): ManageFiltersRailProps {
  return {
    accountValue: 'all',
    accountOptions: manageAccountOptions,
    onAccountChange: vi.fn(),
    statusOptions: manageStatusOptions,
    statusValue: 'all',
    onStatusChange: vi.fn(),
    budgetStateValue: 'any',
    budgetStateOptions: manageBudgetStateOptions,
    onBudgetStateChange: vi.fn(),
    ...overrides,
  };
}

describe('ManageFiltersRail', () => {
  it('fires onAccountChange from the account dropdown', () => {
    const onAccountChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onAccountChange })} />);

    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'adorsys-labs' } });

    expect(onAccountChange).toHaveBeenCalledWith('adorsys-labs');
  });

  it('fires onStatusChange from the segmented control', () => {
    const onStatusChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onStatusChange })} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Archived' }));

    expect(onStatusChange).toHaveBeenCalledWith('archived');
  });

  it('fires onBudgetStateChange from the budget-state dropdown', () => {
    const onBudgetStateChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onBudgetStateChange })} />);

    fireEvent.change(screen.getByLabelText('Budget state'), {
      target: { value: 'near-ceiling' },
    });

    expect(onBudgetStateChange).toHaveBeenCalledWith('near-ceiling');
  });
});
