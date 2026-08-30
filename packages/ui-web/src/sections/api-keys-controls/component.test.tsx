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
  it('renders the project field, the status filter and the search field in one row', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Status filter' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('does NOT render a create action — that moved to PageHeader.action', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.queryByRole('button', { name: /new key/i })).not.toBeInTheDocument();
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

  it('leads with the project selector — on this screen it is a precondition, not a filter', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });

  it('does NOT render an account control — scope is identity, and lives in the sidebar', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('is one landmark region, and a horizontal cluster, not a stacked rail', () => {
    render(<ApiKeysControls {...base} />);

    const region = screen.getByRole('region', { name: 'Filters and actions' });
    expect(region).toHaveClass('flex-wrap', 'items-end');
    expect(region).not.toHaveClass('flex-col');
  });
});
