import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManageProjectsLedger } from './component';
import { manageProjectsFixture, manageTotals } from './fixtures';
import type { ManageProjectsLedgerProps } from './types';

function makeProps(overrides: Partial<ManageProjectsLedgerProps> = {}): ManageProjectsLedgerProps {
  return {
    projects: manageProjectsFixture,
    totals: manageTotals,
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

  it('renders an em dash rather than a fabricated zero for a project with no quota tier', () => {
    render(<ManageProjectsLedger {...makeProps({ projects: [manageProjectsFixture[10]] })} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders a suspended project as "suspended", never as active', () => {
    render(<ManageProjectsLedger {...makeProps({ projects: [manageProjectsFixture[10]] })} />);

    expect(screen.getByText('suspended')).toBeInTheDocument();
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it('renders a quota tier id as text, never coerced into a currency figure', () => {
    render(<ManageProjectsLedger {...makeProps({ projects: [manageProjectsFixture[11]] })} />);

    // pilot-2025 (index 11) is suspended with a real tier assigned ('growth') — a tier label,
    // not a `$`-prefixed number.
    expect(screen.getByText('growth')).toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it('renders the TOTALS footer as an em dash, not $0.00, while spend is unwired', () => {
    render(<ManageProjectsLedger {...makeProps()} />);

    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    // The totals row and every row's SPEND MTD cell all render the same em dash — none of them
    // fabricate a number spend has no live source for yet.
    expect(screen.getAllByText('—').length).toBeGreaterThan(manageProjectsFixture.length);
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
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
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

  it('renders an unrecognized status as "unknown" rather than crashing or defaulting to active', () => {
    render(
      <ManageProjectsLedger
        {...makeProps({
          projects: [{ ...manageProjectsFixture[0], status: 'unknown', statusLabel: 'unknown' }],
        })}
      />
    );

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('renders no toolbar of its own — search, + New project and Monthly report all moved to PageHeader', () => {
    render(<ManageProjectsLedger {...makeProps()} />);

    expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ New project' })).not.toBeInTheDocument();
    expect(screen.queryByText('Monthly report')).not.toBeInTheDocument();
  });
});
