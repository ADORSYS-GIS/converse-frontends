import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageControls } from './component';
import { manageBudgetStateOptions, manageStatusOptions } from './fixtures';
import type { ManageControlsProps } from './types';

function makeProps(overrides: Partial<ManageControlsProps> = {}): ManageControlsProps {
  return {
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

describe('ManageControls', () => {
  it('renders the status and budget-state fields in one row', () => {
    render(<ManageControls {...makeProps()} />);

    expect(screen.getByRole('group', { name: 'Project status' })).toBeInTheDocument();
    expect(screen.getByLabelText('Budget state')).toBeInTheDocument();
  });

  it('renders no Account select of its own — that scope belongs to the sidebar workspace switcher', () => {
    render(<ManageControls {...makeProps()} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it("renders no search field of its own — it moved to ProjectsLedger's own toolbar", () => {
    render(<ManageControls {...makeProps()} />);

    expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
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

  it('is one landmark region, and a horizontal cluster, not a stacked rail', () => {
    render(<ManageControls {...makeProps()} />);

    const region = screen.getByRole('region', { name: 'Filters' });
    expect(region).toHaveClass('flex-wrap', 'items-end');
    expect(region).not.toHaveClass('flex-col');
  });
});
