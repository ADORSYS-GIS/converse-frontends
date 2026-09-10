import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysControls } from './component';
import { API_KEY_STATUS_OPTIONS } from './fixtures';

const base = {
  statusOptions: API_KEY_STATUS_OPTIONS,
  statusValue: 'all',
  onStatusChange: () => {},
  search: '',
  onSearchChange: () => {},
};

describe('ApiKeysControls', () => {
  it('renders the status filter and the search field', () => {
    render(<ApiKeysControls {...base} />);

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

  // 2026-09-03 (ADR 0015 amendment A2): SCOPE is not a filter. The project select is its own
  // `PageControls` group now, parted from these two by a hairline, so `Reset filters` cannot
  // silently move the reader to a different project.
  it('renders no project selector — that is scope, and a group of its own', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument();
  });

  it('does NOT render an account control — scope is identity, and lives in the sidebar', () => {
    render(<ApiKeysControls {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  // 2026-09-03 (ADR 0015 amendment A2): this cluster is a FRAGMENT now, not its own landmark. The
  // `<section aria-label>` and the `flex flex-wrap items-end gap-3` it used to carry are
  // `PageControls`' — the page-level control row — so four sibling clusters stopped spelling the
  // same four utilities. What this asserts is that it did NOT keep a wrapper of its own.
  it('renders no wrapper of its own — `PageControls` owns the row', () => {
    const { container } = render(<ApiKeysControls {...base} />);

    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
