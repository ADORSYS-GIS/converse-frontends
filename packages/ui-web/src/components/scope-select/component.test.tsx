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

describe('ScopeSelect', () => {
  it('lists only projects that belong to the selected account', () => {
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }}
        onChange={() => {}}
      />,
    );

    const projectSelect = screen.getByLabelText('Project');
    expect(screen.getByRole('option', { name: 'gateway-prod' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'gateway-edge' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'support-copilot' })).not.toBeInTheDocument();
    expect(projectSelect).toHaveValue('gateway-prod');
  });

  it('resets projectId to null when the account changes', () => {
    const handleChange = vi.fn();
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }}
        onChange={handleChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'adorsys-labs' } });

    expect(handleChange).toHaveBeenCalledWith({ accountId: 'adorsys-labs', projectId: null });
  });

  it('keeps the account and updates only projectId when the project changes', () => {
    const handleChange = vi.fn();
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: null }}
        onChange={handleChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'gateway-edge' } });

    expect(handleChange).toHaveBeenCalledWith({ accountId: 'adorsys-gis', projectId: 'gateway-edge' });
  });

  it('is a pure controlled component: selecting a project does not change without a value update', () => {
    render(
      <ScopeSelect
        accounts={accounts}
        projects={projects}
        value={{ accountId: 'adorsys-gis', projectId: null }}
        onChange={() => {}}
      />,
    );

    const projectSelect = screen.getByLabelText('Project') as HTMLSelectElement;
    fireEvent.change(projectSelect, { target: { value: 'gateway-edge' } });

    // No re-render triggered by the parent, so the select stays at the controlled value.
    expect(projectSelect.value).toBe('');
  });
});
