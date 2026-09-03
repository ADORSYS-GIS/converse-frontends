import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScopeSelect } from './component';

const accounts = [
  { id: 'adorsys-gis', label: 'adorsys-gis' },
  { id: 'adorsys-labs', label: 'adorsys-labs' },
];

const projects = [
  { id: 'gateway-prod', label: 'gateway-prod', accountId: 'adorsys-gis' },
  { id: 'gateway-edge', label: 'gateway-edge', accountId: 'adorsys-gis' },
  { id: 'support-copilot', label: 'support-copilot', accountId: 'adorsys-labs' },
];

// Base UI `Select.Item` only commits a selection on `click` when a real `pointerdown` preceded
// it on the same item (it tracks pointer type to distinguish a genuine mouse/touch press from a
// bare synthetic click) -- `fireEvent.click` alone is a no-op against it.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('ScopeSelect', () => {
  it('shows the selected account and project labels on the triggers', () => {
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }}
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Account')).toHaveTextContent('adorsys-gis');
    expect(screen.getByLabelText('Project')).toHaveTextContent('gateway-prod');
  });

  it('lists only projects that belong to the selected account when the project popup opens', async () => {
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }}
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText('Project'));

    expect(await screen.findByRole('option', { name: 'gateway-prod' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'gateway-edge' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'support-copilot' })).not.toBeInTheDocument();
  });

  it('resets projectId to null when a different account is chosen', async () => {
    const handleChange = vi.fn();
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Account'));
    selectOption(await screen.findByRole('option', { name: 'adorsys-labs' }));

    expect(handleChange).toHaveBeenCalledWith({ accountId: 'adorsys-labs', projectId: null });
  });

  it('keeps the account and updates only projectId when the project changes', async () => {
    const handleChange = vi.fn();
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: null }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Project'));
    selectOption(await screen.findByRole('option', { name: 'gateway-edge' }));

    expect(handleChange).toHaveBeenCalledWith({
      accountId: 'adorsys-gis',
      projectId: 'gateway-edge',
    });
  });

  it('is a pure controlled component: the trigger label does not change without a value update', async () => {
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: null }}
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText('Project'));
    selectOption(await screen.findByRole('option', { name: 'gateway-edge' }));

    // No re-render triggered by the parent, so the trigger stays on the placeholder.
    expect(screen.getByLabelText('Project')).toHaveTextContent('All projects');
  });
});
