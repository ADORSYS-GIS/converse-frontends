import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageProjectsLedger } from './component';
import { manageProjectsFixture, manageTotals } from './fixtures';
import type { ManageProjectsLedgerProps } from './types';

function makeProps(
  overrides: Partial<ManageProjectsLedgerProps> = {}
): ManageProjectsLedgerProps {
  return {
    projects: manageProjectsFixture,
    totals: manageTotals,
    search: '',
    onSearchChange: vi.fn(),
    onNewProject: vi.fn(),
    onSelectRow: vi.fn(),
    ...overrides,
  };
}

describe('ManageProjectsLedger', () => {
  it('renders the ledger rows and its totals footer', () => {
    render(<ManageProjectsLedger {...makeProps()} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('TOTAL · 12 SHOWN')).toBeInTheDocument();
  });

  it('renders an em dash rather than a fabricated zero for a project with no ceiling', () => {
    render(<ManageProjectsLedger {...makeProps({ projects: [manageProjectsFixture[10]] })} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('fires onNewProject from the toolbar primary', () => {
    const onNewProject = vi.fn();
    render(<ManageProjectsLedger {...makeProps({ onNewProject })} />);

    fireEvent.click(screen.getByRole('button', { name: '+ New project' }));

    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it('fires onSelectRow when a row is activated', () => {
    const onSelectRow = vi.fn();
    render(<ManageProjectsLedger {...makeProps({ onSelectRow })} />);

    fireEvent.click(screen.getByText('gateway-prod'));

    expect(onSelectRow).toHaveBeenCalledWith(manageProjectsFixture[0]);
  });

  it('shows an inline empty status above the still-rendered ledger header', () => {
    render(<ManageProjectsLedger {...makeProps({ projects: [], totals: undefined })} />);

    expect(screen.getByText('No projects in this account yet.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'NAME' })).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(
      <ManageProjectsLedger
        {...makeProps({ projects: [], error: 'Failed to load projects.', onRetry })}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load projects.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the report trigger row only when a trigger is supplied', () => {
    const { rerender } = render(<ManageProjectsLedger {...makeProps()} />);
    expect(screen.queryByText('MONTHLY REPORT')).not.toBeInTheDocument();

    rerender(
      <ManageProjectsLedger
        {...makeProps({ reportTrigger: <button type="button">Open monthly report</button> })}
      />
    );

    expect(screen.getByText('MONTHLY REPORT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open monthly report' })).toBeInTheDocument();
  });
});
