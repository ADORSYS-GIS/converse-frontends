import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateApiKeyDialog } from './component';
import type { CreateApiKeyPlanOption } from './types';

const PLANS: CreateApiKeyPlanOption[] = [
  { id: 'free', name: 'Free', limits: { requestsPerSecond: 2, requestsPerDay: 500 } },
  { id: 'pro', name: 'Pro', limits: { requestsPerSecond: 20, requestsPerDay: 50_000 } },
  { id: 'enterprise', name: 'Enterprise', limits: null },
];

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '89', label: '89 days' },
];

const PROJECT_OPTIONS = [
  { value: 'proj_default', label: 'Default Project' },
  { value: 'proj_gateway', label: 'gateway-prod' },
];

// Base UI `Select.Item` only commits a selection on `click` when a real `pointerdown` preceded it
// on the same item — see `ScopeSelect`'s own test file for the same helper.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

function baseProps(
  overrides: Partial<React.ComponentProps<typeof CreateApiKeyDialog>> = {}
): React.ComponentProps<typeof CreateApiKeyDialog> {
  return {
    open: true,
    projectOptions: PROJECT_OPTIONS,
    projectId: 'proj_default',
    onProjectChange: vi.fn(),
    name: '',
    onNameChange: vi.fn(),
    expiryDays: '30',
    expiryOptions: EXPIRY_OPTIONS,
    onExpiryDaysChange: vi.fn(),
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

describe('CreateApiKeyDialog', () => {
  it('renders nothing when closed', () => {
    render(<CreateApiKeyDialog {...baseProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the dialog accessibly', async () => {
    render(<CreateApiKeyDialog {...baseProps()} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('New API key');
  });

  it('offers a real Project field — live findings #4: this used to be a fixed label with no picker', () => {
    render(<CreateApiKeyDialog {...baseProps()} />);
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });

  it('never hardcodes a project — the picker only ever offers what `projectOptions` passes in', async () => {
    render(<CreateApiKeyDialog {...baseProps()} />);

    fireEvent.click(screen.getByLabelText('Project'));

    expect(await screen.findByRole('option', { name: 'Default Project' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'gateway-prod' })).toBeInTheDocument();
  });

  it('fires onProjectChange with the real project id when a project is picked', async () => {
    const onProjectChange = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ onProjectChange })} />);

    fireEvent.click(screen.getByLabelText('Project'));
    selectOption(await screen.findByRole('option', { name: 'gateway-prod' }));

    expect(onProjectChange).toHaveBeenCalledWith('proj_gateway');
  });

  it('states why the selected project cannot take a new key, rather than a silent disable', () => {
    render(
      <CreateApiKeyDialog
        {...baseProps({
          projectReason: 'Only the project owner or a lead can create keys here.',
          canSubmit: false,
        })}
      />
    );
    expect(
      screen.getByText('Only the project owner or a lead can create keys here.')
    ).toBeInTheDocument();
  });

  it('renders no project reason caption once the selected project is eligible', () => {
    render(<CreateApiKeyDialog {...baseProps({ projectReason: undefined })} />);
    expect(
      screen.queryByText(/project owner or a lead|Checking whether|Couldn.t confirm/)
    ).not.toBeInTheDocument();
  });

  it('never hardcodes a plan — the picker only ever offers what `plans` passes in', async () => {
    render(<CreateApiKeyDialog {...baseProps()} />);

    fireEvent.click(screen.getByLabelText('Billing plan'));

    expect(await screen.findByRole('option', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Enterprise' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'standard' })).not.toBeInTheDocument();
  });

  it('fires onPlanChange with the real plan id when a plan is picked', async () => {
    const onPlanChange = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ onPlanChange })} />);

    fireEvent.click(screen.getByLabelText('Billing plan'));
    selectOption(await screen.findByRole('option', { name: 'Free' }));

    expect(onPlanChange).toHaveBeenCalledWith('free');
  });

  it("renders the selected plan's configured limits", () => {
    render(<CreateApiKeyDialog {...baseProps({ planId: 'free' })} />);
    expect(screen.getByText('2/s · 500/day')).toBeInTheDocument();
  });

  it('renders "No configured limits." rather than 0 when the plan carries none', () => {
    render(<CreateApiKeyDialog {...baseProps({ planId: 'enterprise' })} />);
    expect(screen.getByText('No configured limits.')).toBeInTheDocument();
    expect(screen.queryByText(/\b0\/s\b/)).not.toBeInTheDocument();
  });

  it('disables the plan picker and offers no options while the catalogue is loading', () => {
    render(<CreateApiKeyDialog {...baseProps({ plans: [], plansLoading: true, planId: null })} />);
    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
    expect(screen.getByLabelText('Billing plan')).toHaveTextContent('Loading plans…');
  });

  it('fails safely with a clear message when the catalogue fetch fails, never a guessed plan', () => {
    render(
      <CreateApiKeyDialog
        {...baseProps({ plans: [], planId: null, plansError: "Couldn't load billing plans." })}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load billing plans.");
    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
  });

  it('fires onRetryPlans from the catalogue error line', () => {
    const onRetryPlans = vi.fn();
    render(
      <CreateApiKeyDialog
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
    render(<CreateApiKeyDialog {...baseProps({ onNameChange })} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'ci-deploy' } });
    expect(onNameChange).toHaveBeenCalledWith('ci-deploy');
  });

  it('fires onExpiryDaysChange when a different preset is picked', () => {
    const onExpiryDaysChange = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ onExpiryDaysChange })} />);

    screen.getByRole('button', { name: '89 days' }).click();
    expect(onExpiryDaysChange).toHaveBeenCalledWith('89');
  });

  it('disables Create key when canSubmit is false', () => {
    render(<CreateApiKeyDialog {...baseProps({ canSubmit: false })} />);
    expect(screen.getByRole('button', { name: 'Create key' })).toBeDisabled();
  });

  it('fires onSubmit only once enabled and clicked', () => {
    const onSubmit = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ canSubmit: true, onSubmit })} />);

    screen.getByRole('button', { name: 'Create key' }).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ onCancel })} />);

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Escape', async () => {
    const onCancel = vi.fn();
    render(<CreateApiKeyDialog {...baseProps({ onCancel })} />);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('dialog').catch(() => null)).toBeDefined();
    expect(onCancel).toHaveBeenCalled();
  });

  it('stays open and shows the inline submit error on failure', async () => {
    render(
      <CreateApiKeyDialog
        {...baseProps({
          error:
            "unknown billing_plan 'standard': must be one of the configured plans [free, pro, enterprise]",
        })}
      />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("unknown billing_plan 'standard'");
  });

  it('shows a submitting label and disables Create key while in flight', () => {
    render(<CreateApiKeyDialog {...baseProps({ submitting: true, canSubmit: true })} />);
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  });
});
