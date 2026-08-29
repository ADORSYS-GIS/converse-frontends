import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysControls } from './component';
import { API_KEY_PROJECT_OPTIONS, API_KEY_STATUS_OPTIONS } from './fixtures';

const base = {
  projectField: {
    label: 'Project',
    value: 'gateway-prod',
    options: API_KEY_PROJECT_OPTIONS,
    onChange: () => {},
  },
  statusOptions: API_KEY_STATUS_OPTIONS,
  statusValue: 'all',
  onStatusChange: () => {},
  search: '',
  onSearchChange: () => {},
};

describe('ApiKeysControls', () => {
  it('renders the status filter, the search field and the create action in one row', () => {
    render(<ApiKeysControls {...base} onCreate={() => {}} />);

    expect(screen.getByRole('group', { name: 'Status filter' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New key' })).toBeInTheDocument();
  });

  it('reports status changes', () => {
    const onStatusChange = vi.fn();
    render(<ApiKeysControls {...base} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    expect(onStatusChange).toHaveBeenCalledWith('active');
  });

  it('reports search input', () => {
    const onSearchChange = vi.fn();
    render(<ApiKeysControls {...base} onSearchChange={onSearchChange} />);

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'desktop' } });
    expect(onSearchChange).toHaveBeenCalledWith('desktop');
  });

  it('states visibly why creation is unavailable instead of leaving a dead disabled button', () => {
    render(<ApiKeysControls {...base} createDisabledReason="Select a project to create a key." />);

    expect(screen.getByRole('button', { name: '+ New key' })).toBeDisabled();
    // Visible, not merely a `title` tooltip.
    expect(screen.getByText('Select a project to create a key.')).toBeInTheDocument();
  });

  it('drops the reason line once creation becomes available', () => {
    render(
      <ApiKeysControls
        {...base}
        onCreate={() => {}}
        createDisabledReason="Select a project to create a key."
      />
    );

    expect(screen.getByRole('button', { name: '+ New key' })).toBeEnabled();
    expect(screen.queryByText('Select a project to create a key.')).not.toBeInTheDocument();
  });

  it('leads with the project selector — on this screen it is a precondition, not a filter', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });

  it('does NOT render an account control — scope is identity, and lives in the header', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('is one landmark region', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.getByRole('region', { name: 'Filters and actions' })).toBeInTheDocument();
  });
});
