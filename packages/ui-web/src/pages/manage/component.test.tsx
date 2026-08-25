import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

// Every `SectionSheet` (including the selection-driven SELECTION one) is gated by
// `useIsBelowLg`, which defaults to "assume below lg" when `matchMedia` is unavailable — jsdom
// doesn't implement it here, so that is this file's natural baseline and most tests need no
// mock at all. The handful of tests that specifically need to prove "at lg" behaviour mock
// `matchMedia` explicitly.
function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('ManagePage', () => {
  afterEach(() => {
    // @ts-expect-error - restore jsdom's own "matchMedia does not exist" baseline, in case a
    // test mocked it.
    delete window.matchMedia;
  });

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
      mockMatchMedia(false); // simulate `lg` — keep the SELECTION-sheet's own auto-open out of
      // this test's way; that behaviour has its own dedicated tests below.
      const project = manageProjectsFixture[0];
      render(<ManagePage {...baseProps({ selectedProject: project, selectedRowKeys: [project.id] })} />);

      expect(screen.queryByText('No rows selected.')).not.toBeInTheDocument();
      // The project name now appears twice: once in the ledger row, once in SELECTION — scope
      // the assertion to the SELECTION panel itself.
      expect(screen.getAllByText(project.name).length).toBeGreaterThanOrEqual(2);
      const selectionPanel = screen.getByText('SELECTION').parentElement as HTMLElement;
      expect(within(selectionPanel).getByText(project.account)).toBeInTheDocument();
    });

    it('opens the compact-tier SELECTION sheet automatically once a row is selected below lg, without needing a trigger', () => {
      mockMatchMedia(true); // simulate below `lg` — matches this file's natural default, made
      // explicit here since this test's whole point is proving the below-lg behaviour.
      const project = manageProjectsFixture[0];
      const { rerender } = render(<ManagePage {...baseProps({ selectedProject: null })} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<ManagePage {...baseProps({ selectedProject: project, selectedRowKeys: [project.id] })} />);

      const dialog = screen.getByRole('dialog', { name: 'SELECTION' });
      expect(within(dialog).getByText(project.account)).toBeInTheDocument();
    });

    it('does NOT open the SELECTION sheet on selection at lg — selecting a row must never mount an invisible-but-modal dialog that freezes the rest of the page', () => {
      mockMatchMedia(false); // simulate `lg`
      const project = manageProjectsFixture[0];
      render(<ManagePage {...baseProps({ selectedProject: project, selectedRowKeys: [project.id] })} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // The ledger rows must stay reachable — a modal dialog would mark them aria-hidden.
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    });

    it('fires onSelectRow with the clicked row', () => {
      const onSelectRow = vi.fn();
      render(<ManagePage {...baseProps({ onSelectRow })} />);

      const rows = screen.getAllByRole('row').slice(1); // skip header row
      fireEvent.click(rows[0]);

      expect(onSelectRow).toHaveBeenCalledWith(manageProjectsFixture[0]);
    });

    it('marks the aria-selected row that matches selectedRowKeys', () => {
      mockMatchMedia(false); // simulate `lg` — keep the SELECTION-sheet's own auto-open (which
      // would mark these rows aria-hidden behind a modal) out of this test's way.
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

  // Compact-tier contextual sheet triggers (console-ui skill "Shape and layout", 2026-08-25
  // revision) — no persistent right-rail footer/peek bar; FILTERS and MONTHLY REPORT are each
  // reached via a trigger placed in context, opening only that one rail section as a
  // SectionSheet. SELECTION has its own dedicated test above (selection-driven, no trigger).
  describe('compact-tier contextual sheet triggers', () => {
    it('opens the FILTERS sheet from the trigger beside the search field', () => {
      render(<ManagePage {...baseProps()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

      const dialog = screen.getByRole('dialog', { name: 'FILTERS' });
      expect(within(dialog).getByLabelText('Project status')).toBeInTheDocument();
    });

    it('opens the MONTHLY REPORT sheet from the trigger by the table totals/footer zone', () => {
      render(<ManagePage {...baseProps()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Open monthly report' }));

      const dialog = screen.getByRole('dialog', { name: 'MONTHLY REPORT' });
      expect(within(dialog).getByRole('button', { name: 'Generate report' })).toBeInTheDocument();
    });

    it('dismisses a sheet via its close control', () => {
      render(<ManagePage {...baseProps()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
      expect(screen.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
