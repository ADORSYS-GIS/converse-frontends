import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from '../../components/empty-state';
import { ProjectsLedger } from './component';
import { projectsFixture } from './fixtures';
import type { ProjectsLedgerProps } from './types';

function makeProps(overrides: Partial<ProjectsLedgerProps> = {}): ProjectsLedgerProps {
  return {
    projects: projectsFixture,
    search: '',
    onSearchChange: vi.fn(),
    onSelectRow: vi.fn(),
    ...overrides,
  };
}

describe('ProjectsLedger', () => {
  it('renders the ledger rows', () => {
    render(<ProjectsLedger {...makeProps()} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
  });

  it('renders no Account column — every row is already scoped to one account by the toolbar filter', () => {
    render(<ProjectsLedger {...makeProps()} />);

    expect(screen.queryByRole('columnheader', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.queryByText('adorsys-gis')).not.toBeInTheDocument();
  });

  it('renders no totals footer — spend is a live per-row figure now, not a permanently-dashed aggregate', () => {
    render(<ProjectsLedger {...makeProps()} />);

    expect(screen.queryByText(/^TOTAL/)).not.toBeInTheDocument();
  });

  it('renders an em dash rather than a fabricated zero for a project with no quota tier', () => {
    render(<ProjectsLedger {...makeProps({ projects: [projectsFixture[9]] })} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders a suspended project as "suspended", never as active', () => {
    render(<ProjectsLedger {...makeProps({ projects: [projectsFixture[10]] })} />);

    expect(screen.getByText('suspended')).toBeInTheDocument();
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it('renders a quota tier id as text, never coerced into a currency figure', () => {
    render(<ProjectsLedger {...makeProps({ projects: [projectsFixture[11]] })} />);

    expect(screen.getByText('growth')).toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it('renders a resolved spend figure once wired, formatted as currency', () => {
    render(
      <ProjectsLedger {...makeProps({ projects: [{ ...projectsFixture[0], spendMtd: 128.4 }] })} />
    );

    expect(screen.getByText('$128.40')).toBeInTheDocument();
  });

  it('fires onSelectRow when a row is activated', () => {
    const onSelectRow = vi.fn();
    render(<ProjectsLedger {...makeProps({ onSelectRow })} />);

    fireEvent.click(screen.getByText('gateway-prod'));

    expect(onSelectRow).toHaveBeenCalledWith(projectsFixture[0]);
  });

  it('renders Name and Spend MTD as sortable columns', () => {
    render(<ProjectsLedger {...makeProps()} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Spend MTD' })).toHaveAttribute(
      'aria-sort',
      'none'
    );
    expect(screen.getByRole('columnheader', { name: 'Quota tier' })).not.toHaveAttribute(
      'aria-sort'
    );
  });

  it('fires onSortChange from the Name header', () => {
    const onSortChange = vi.fn();
    render(<ProjectsLedger {...makeProps({ onSortChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
  });

  it('renders the search field, left of any filters slot', () => {
    const onSearchChange = vi.fn();
    render(<ProjectsLedger {...makeProps({ search: 'gate', onSearchChange })} />);

    const input = screen.getByLabelText('Search');
    expect(input).toHaveValue('gate');
    fireEvent.change(input, { target: { value: 'gateway' } });
    expect(onSearchChange).toHaveBeenCalledWith('gateway');
  });

  it('renders the filters slot', () => {
    render(<ProjectsLedger {...makeProps({ filters: <button type="button">Status</button> })} />);

    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
  });

  it('renders EmptyState (with its CTA) instead of the table for a true empty collection', () => {
    render(
      <ProjectsLedger
        {...makeProps({
          projects: [],
          emptyState: (
            <EmptyState
              headline="No projects yet"
              explainer="Create your first project to start issuing API keys."
              action={<button type="button">+ New project</button>}
            />
          ),
        })}
      />
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New project' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an inline status line above the still-rendered table when a filter empties the list', () => {
    render(
      <ProjectsLedger
        {...makeProps({ projects: [], filteredEmptyMessage: 'No projects match these filters.' })}
      />
    );

    expect(screen.getByText('No projects match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error, ahead of any empty state', () => {
    const onRetry = vi.fn();
    render(
      <ProjectsLedger
        {...makeProps({
          projects: [],
          error: 'Failed to load projects.',
          onRetry,
          emptyState: <EmptyState headline="No projects yet" />,
        })}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load projects.');
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders an unrecognized status as "unknown" rather than crashing or defaulting to active', () => {
    render(
      <ProjectsLedger
        {...makeProps({
          projects: [{ ...projectsFixture[0], status: 'unknown', statusLabel: 'unknown' }],
        })}
      />
    );

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('renders the Pagination component when pagination is given', () => {
    render(
      <ProjectsLedger
        {...makeProps({
          pagination: {
            shown: 12,
            total: 24,
            hasPrev: false,
            hasNext: true,
            onPrev: vi.fn(),
            onNext: vi.fn(),
          },
        })}
      />
    );

    expect(screen.getByText('Showing 12 of 24 projects')).toBeInTheDocument();
  });
});
