import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManagePage } from './component';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageNavItems,
  manageProjectsFixture,
  manageStatusOptions,
  manageSubNavItems,
} from './fixtures';
import type { ManagePageProps, ProjectRow } from './types';

function baseProps(overrides: Partial<ManagePageProps> = {}): ManagePageProps {
  return {
    tier: 'full',
    header: <div>Header</div>,
    nav: { items: manageNavItems },
    subNav: { items: manageSubNavItems },
    projects: manageProjectsFixture,
    search: '',
    onSearchChange: vi.fn(),
    onNewProject: vi.fn(),
    onSelectRow: vi.fn(),
    selectedProject: null,
    reportExport: {
      period: '2026-02',
      onPeriodChange: vi.fn(),
      scopeSlot: <div>Scope slot</div>,
      groupByOptions: [{ value: 'project', label: 'Project' }],
      groupBy: 'project',
      onGroupByChange: vi.fn(),
      includeToggles: [],
      onToggleInclude: vi.fn(),
      format: 'csv',
      onFormatChange: vi.fn(),
      onGenerate: vi.fn(),
      lastExports: [],
    },
    filters: {
      accountValue: 'all',
      accountOptions: manageAccountOptions,
      onAccountChange: vi.fn(),
      statusOptions: manageStatusOptions,
      statusValue: 'all',
      onStatusChange: vi.fn(),
      budgetStateValue: 'any',
      budgetStateOptions: manageBudgetStateOptions,
      onBudgetStateChange: vi.fn(),
    },
    ...overrides,
  };
}

describe('ManagePage', () => {
  it('renders the projects ledger from props, including a totals footer when given', () => {
    render(
      <ManagePage
        {...baseProps({
          totals: { shownLabel: 'TOTAL · 12 SHOWN', spendMtd: 1131.8, ceiling: 2250, usedPercent: 50 },
        })}
      />,
    );

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('TOTAL · 12 SHOWN')).toBeInTheDocument();
    expect(screen.getByText('$1 131.80')).toBeInTheDocument();
  });

  describe('selection → rail retarget wiring', () => {
    it('shows "No rows selected." in the SELECTION panel when selectedProject is null', () => {
      render(<ManagePage {...baseProps({ selectedProject: null })} />);

      expect(screen.getByText('No rows selected.')).toBeInTheDocument();
    });

    it('retargets the SELECTION panel to the given selectedProject', () => {
      const project = manageProjectsFixture[0];
      render(<ManagePage {...baseProps({ selectedProject: project, selectedRowKeys: [project.id] })} />);

      expect(screen.queryByText('No rows selected.')).not.toBeInTheDocument();
      // The project name now appears twice: once in the ledger row, once in SELECTION — scope
      // the assertion to the SELECTION panel itself.
      expect(screen.getAllByText(project.name).length).toBeGreaterThanOrEqual(2);
      const selectionPanel = screen.getByText('SELECTION').parentElement as HTMLElement;
      expect(within(selectionPanel).getByText(project.account)).toBeInTheDocument();
    });

    it('fires onSelectRow with the clicked row', () => {
      const onSelectRow = vi.fn();
      render(<ManagePage {...baseProps({ onSelectRow })} />);

      const rows = screen.getAllByRole('row').slice(1); // skip header row
      fireEvent.click(rows[0]);

      expect(onSelectRow).toHaveBeenCalledWith(manageProjectsFixture[0]);
    });

    it('marks the aria-selected row that matches selectedRowKeys', () => {
      const project = manageProjectsFixture[1];
      render(<ManagePage {...baseProps({ selectedProject: project, selectedRowKeys: [project.id] })} />);

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');
      expect(rows[0]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('export onGenerate params', () => {
    it('fires onGenerate with the current period/groupBy/format/includes on Generate report', () => {
      const onGenerate = vi.fn();
      render(
        <ManagePage
          {...baseProps({
            reportExport: {
              period: '2026-02',
              onPeriodChange: vi.fn(),
              scopeSlot: <div>Scope slot</div>,
              groupByOptions: [{ value: 'project-model', label: 'Project × Model' }],
              groupBy: 'project-model',
              onGroupByChange: vi.fn(),
              includeToggles: [{ id: 'per-model', label: 'Per-model breakdown', checked: true }],
              onToggleInclude: vi.fn(),
              format: 'pdf',
              onFormatChange: vi.fn(),
              onGenerate,
              lastExports: [],
            },
          })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));

      expect(onGenerate).toHaveBeenCalledWith({
        period: '2026-02',
        groupBy: 'project-model',
        format: 'pdf',
        includes: ['per-model'],
      });
    });

    it('disables the Generate control while generating, keeping filters interactive', () => {
      render(<ManagePage {...baseProps({ reportExport: { ...baseProps().reportExport, generating: true } })} />);

      expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
    });
  });

  it('shows an inline empty status above the still-rendered ledger header when there are no projects', () => {
    render(<ManagePage {...baseProps({ projects: [] })} />);

    expect(screen.getByText('No projects in this account yet.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'NAME' })).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(<ManagePage {...baseProps({ projects: [], error: 'Failed to load projects.', onRetry })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load projects.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('fires onNewProject from the toolbar CTA', () => {
    const onNewProject = vi.fn();
    render(<ManagePage {...baseProps({ onNewProject })} />);

    fireEvent.click(screen.getByRole('button', { name: '+ New project' }));
    expect(onNewProject).toHaveBeenCalledTimes(1);
  });
});
