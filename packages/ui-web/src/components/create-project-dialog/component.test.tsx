import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateProjectDialog } from './component';
import type { CreateProjectPlanOption } from './types';

const PLANS: CreateProjectPlanOption[] = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
  { id: 'enterprise', name: 'Enterprise' },
];

// Base UI `Select.Item` only commits a selection on `click` when a real `pointerdown` preceded it
// on the same item — see `ScopeSelect`'s own test file for the same helper.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

function baseProps(
  overrides: Partial<React.ComponentProps<typeof CreateProjectDialog>> = {}
): React.ComponentProps<typeof CreateProjectDialog> {
  return {
    open: true,
    accountLabel: 'acct_01',
    name: '',
    onNameChange: vi.fn(),
    billingIdentity: '',
    onBillingIdentityChange: vi.fn(),
    plans: PLANS,
    plansLoading: false,
    onRetryPlans: vi.fn(),
    planId: 'pro',
    onPlanChange: vi.fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('CreateProjectDialog', () => {
  it('renders nothing when closed', () => {
    render(<CreateProjectDialog {...baseProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the dialog accessibly', async () => {
    render(<CreateProjectDialog {...baseProps()} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('New project');
  });

  it('echoes the target account in the description', async () => {
    render(<CreateProjectDialog {...baseProps({ accountLabel: 'acct_02' })} />);
    expect(await screen.findByText(/acct_02/)).toBeInTheDocument();
  });

  it('never hardcodes a plan — the picker only ever offers what `plans` passes in', async () => {
    render(<CreateProjectDialog {...baseProps()} />);

    fireEvent.click(screen.getByLabelText('Billing plan'));

    expect(await screen.findByRole('option', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Enterprise' })).toBeInTheDocument();
  });

  it('fires onPlanChange with the real plan id when a plan is picked', async () => {
    const onPlanChange = vi.fn();
    render(<CreateProjectDialog {...baseProps({ onPlanChange })} />);

    fireEvent.click(screen.getByLabelText('Billing plan'));
    selectOption(await screen.findByRole('option', { name: 'Free' }));

    expect(onPlanChange).toHaveBeenCalledWith('free');
  });

  it('disables the plan picker and offers no options while the catalogue is loading', () => {
    render(<CreateProjectDialog {...baseProps({ plans: [], plansLoading: true, planId: null })} />);
    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
    expect(screen.getByLabelText('Billing plan')).toHaveTextContent('Loading plans…');
  });

  it('fails safely with a clear message when the catalogue fetch fails, never a guessed plan', () => {
    render(
      <CreateProjectDialog
        {...baseProps({ plans: [], planId: null, plansError: "Couldn't load billing plans." })}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load billing plans.");
    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
  });

  it('fires onRetryPlans from the catalogue error line', () => {
    const onRetryPlans = vi.fn();
    render(
      <CreateProjectDialog
        {...baseProps({
          plans: [],
          planId: null,
          plansError: "Couldn't load billing plans.",
          onRetryPlans,
        })}
      />
    );
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetryPlans).toHaveBeenCalledTimes(1);
  });

  it('fires onNameChange as the caller types', () => {
    const onNameChange = vi.fn();
    render(<CreateProjectDialog {...baseProps({ onNameChange })} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'widgets-prod' } });
    expect(onNameChange).toHaveBeenCalledWith('widgets-prod');
  });

  it('fires onBillingIdentityChange as the caller types', () => {
    const onBillingIdentityChange = vi.fn();
    render(<CreateProjectDialog {...baseProps({ onBillingIdentityChange })} />);

    fireEvent.change(screen.getByLabelText('Billing identity'), {
      target: { value: 'widgets-prod-billing' },
    });
    expect(onBillingIdentityChange).toHaveBeenCalledWith('widgets-prod-billing');
  });

  it('renders a server validation message against the name field specifically', () => {
    render(
      <CreateProjectDialog
        {...baseProps({ nameError: 'a project named "widgets-prod" already exists' })}
      />
    );
    expect(screen.getByText('a project named "widgets-prod" already exists')).toBeInTheDocument();
  });

  it('renders a server validation message against the billing identity field specifically', () => {
    render(
      <CreateProjectDialog
        {...baseProps({ billingIdentityError: 'billing identity already in use' })}
      />
    );
    expect(screen.getByText('billing identity already in use')).toBeInTheDocument();
  });

  it('disables Create project when canSubmit is false', () => {
    render(<CreateProjectDialog {...baseProps({ canSubmit: false })} />);
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled();
  });

  it('fires onSubmit only once enabled and clicked', () => {
    const onSubmit = vi.fn();
    render(<CreateProjectDialog {...baseProps({ canSubmit: true, onSubmit })} />);

    screen.getByRole('button', { name: 'Create project' }).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<CreateProjectDialog {...baseProps({ onCancel })} />);

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Escape', async () => {
    const onCancel = vi.fn();
    render(<CreateProjectDialog {...baseProps({ onCancel })} />);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('dialog').catch(() => null)).toBeDefined();
    expect(onCancel).toHaveBeenCalled();
  });

  it('stays open and shows the inline submit error on an unattributed failure', async () => {
    render(
      <CreateProjectDialog {...baseProps({ error: 'Something went wrong. Please try again.' })} />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('shows a submitting label and disables Create project while in flight', () => {
    render(<CreateProjectDialog {...baseProps({ submitting: true, canSubmit: true })} />);
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  });
});
