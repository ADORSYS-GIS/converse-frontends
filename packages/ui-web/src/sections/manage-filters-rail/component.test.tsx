import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageFiltersRail } from './component';
import { manageAccountOptions, manageBudgetStateOptions, manageStatusOptions } from './fixtures';
import type { ManageFiltersRailProps } from './types';

function makeProps(overrides: Partial<ManageFiltersRailProps> = {}): ManageFiltersRailProps {
  return {
    accountValue: 'all',
    accountOptions: manageAccountOptions,
    onAccountChange: vi.fn(),
    statusOptions: manageStatusOptions,
    statusValue: 'all',
    onStatusChange: vi.fn(),
    budgetStateValue: 'all',
    budgetStateOptions: manageBudgetStateOptions,
    onBudgetStateChange: vi.fn(),
    ...overrides,
  };
}

// Base UI `Select.Item` commits only when a real `pointerdown` preceded the click on the same
// item -- see `scope-select/component.test.tsx`.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('ManageFiltersRail', () => {
  it('fires onAccountChange from the account dropdown', async () => {
    const onAccountChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onAccountChange })} />);

    fireEvent.click(screen.getByLabelText('Account'));
    selectOption(await screen.findByRole('option', { name: 'adorsys-labs' }));

    expect(onAccountChange).toHaveBeenCalledWith('adorsys-labs');
  });

  it('fires onStatusChange from the segmented control', () => {
    const onStatusChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onStatusChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suspended' }));

    expect(onStatusChange).toHaveBeenCalledWith('suspended');
  });

  it('fires onBudgetStateChange from the budget-state dropdown', async () => {
    const onBudgetStateChange = vi.fn();
    render(<ManageFiltersRail {...makeProps({ onBudgetStateChange })} />);

    fireEvent.click(screen.getByLabelText('Budget state'));
    selectOption(await screen.findByRole('option', { name: 'Quota set' }));

    expect(onBudgetStateChange).toHaveBeenCalledWith('quota-set');
  });
});
