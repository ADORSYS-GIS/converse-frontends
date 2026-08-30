import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageControls } from './component';
import { manageAccountOptions, manageBudgetStateOptions, manageStatusOptions } from './fixtures';
import type { ManageControlsProps } from './types';

function makeProps(overrides: Partial<ManageControlsProps> = {}): ManageControlsProps {
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
    search: '',
    onSearchChange: vi.fn(),
    ...overrides,
  };
}

// Base UI `Select.Item` commits only when a real `pointerdown` preceded the click on the same
// item -- see `scope-select/component.test.tsx`.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('ManageControls', () => {
  it('renders the account, status, budget-state and search fields in one row', () => {
    render(<ManageControls {...makeProps()} />);

    expect(screen.getByLabelText('Account')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Project status' })).toBeInTheDocument();
    expect(screen.getByLabelText('Budget state')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('fires onAccountChange from the account dropdown', async () => {
    const onAccountChange = vi.fn();
    render(<ManageControls {...makeProps({ onAccountChange })} />);

    fireEvent.click(screen.getByLabelText('Account'));
    selectOption(await screen.findByRole('option', { name: 'adorsys-labs' }));

    expect(onAccountChange).toHaveBeenCalledWith('adorsys-labs');
  });

  it('fires onStatusChange from the segmented control', () => {
    const onStatusChange = vi.fn();
    render(<ManageControls {...makeProps({ onStatusChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suspended' }));

    expect(onStatusChange).toHaveBeenCalledWith('suspended');
  });

  it('fires onBudgetStateChange from the budget-state dropdown', async () => {
    const onBudgetStateChange = vi.fn();
    render(<ManageControls {...makeProps({ onBudgetStateChange })} />);

    fireEvent.click(screen.getByLabelText('Budget state'));
    selectOption(await screen.findByRole('option', { name: 'Quota set' }));

    expect(onBudgetStateChange).toHaveBeenCalledWith('quota-set');
  });

  it('fires onSearchChange from the search field', () => {
    const onSearchChange = vi.fn();
    render(<ManageControls {...makeProps({ onSearchChange })} />);

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'gateway' } });

    expect(onSearchChange).toHaveBeenCalledWith('gateway');
  });

  it('is one landmark region, and a horizontal cluster, not a stacked rail', () => {
    render(<ManageControls {...makeProps()} />);

    const region = screen.getByRole('region', { name: 'Filters' });
    expect(region).toHaveClass('flex-wrap', 'items-end');
    expect(region).not.toHaveClass('flex-col');
  });
});
