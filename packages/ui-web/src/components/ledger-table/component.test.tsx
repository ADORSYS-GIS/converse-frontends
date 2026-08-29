import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LedgerTable } from './component';
import type { LedgerColumn } from './types';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const columns: LedgerColumn<Row>[] = [
  { key: 'name', header: 'Name', accessor: (row) => row.name },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    accessor: (row) => `$${row.amount.toFixed(2)}`,
  },
];

const rows: Row[] = [
  { id: 'a', name: 'ci-deploy', amount: 12.5 },
  { id: 'b', name: 'gateway-edge', amount: 8 },
];

describe('LedgerTable', () => {
  it('renders the column headers', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
  });

  it('renders one row per data item via the accessor', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    expect(screen.getByText('ci-deploy')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('still renders the header row when data is empty', () => {
    render(<LedgerTable columns={columns} data={[]} rowKey={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /ci-deploy/ })).not.toBeInTheDocument();
  });

  it('right-aligns columns marked align: right', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveClass('text-right');
    expect(screen.getByText('$12.50')).toHaveClass('text-right');
  });

  it('marks rows aria-selected when selectedRowKeys includes them', () => {
    render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        selectedRowKeys={['a']}
        onSelectRow={() => {}}
      />
    );

    const rowEls = screen.getAllByRole('row').slice(1); // skip header row
    expect(rowEls[0]).toHaveAttribute('aria-selected', 'true');
    expect(rowEls[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onSelectRow on click and on Enter', () => {
    const onSelectRow = vi.fn();
    render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        onSelectRow={onSelectRow}
      />
    );

    const rowEls = screen.getAllByRole('row').slice(1);
    rowEls[0].click();
    expect(onSelectRow).toHaveBeenCalledWith(rows[0]);

    rowEls[1].focus();
    rowEls[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelectRow).toHaveBeenCalledWith(rows[1]);
  });

  it('does not make rows focusable or selected when onSelectRow is absent', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    const rowEls = screen.getAllByRole('row').slice(1);
    expect(rowEls[0]).not.toHaveAttribute('tabindex');
    expect(rowEls[0]).not.toHaveAttribute('aria-selected');
  });

  it('renders row actions revealed on hover/focus', () => {
    render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        renderRowActions={(row) => <button type="button">Rotate {row.name}</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Rotate ci-deploy' })).toBeInTheDocument();
  });

  it('renders a totals footer above a border rule', () => {
    render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        totals={{ name: 'TOTAL · 2 SHOWN', amount: '$20.50' }}
      />
    );

    expect(screen.getByText('TOTAL · 2 SHOWN')).toBeInTheDocument();
    expect(screen.getByText('$20.50')).toBeInTheDocument();
  });

  it('omits the totals row when none is given', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    expect(screen.queryByText(/TOTAL/)).not.toBeInTheDocument();
  });

  it('wraps the table in its own horizontal scroll container (console-ui skill: no page overflow)', () => {
    render(<LedgerTable columns={columns} data={rows} rowKey={(row) => row.id} />);

    const table = screen.getByRole('table');
    // The table's natural (unshrunk) width and the box's two overflow axes are both `theme.css`
    // rules now — `console-table` and `ledger-scroll`. `overflow-y: clip` is load-bearing there:
    // `overflow-x: auto` alone computes `overflow-y` to `auto`, which turns the box into a
    // vertical scroll container and eats the wheel.
    expect(table).toHaveClass('console-table');
    expect(table.parentElement).toHaveClass('ledger-scroll');
    // A deliberate axe `scrollable-region-focusable` fix, and deliberately NOT a landmark: two
    // ledgers on one page would trip `landmark-unique`.
    expect(table.parentElement).toHaveAttribute('tabindex', '0');
    expect(table.parentElement).not.toHaveAttribute('role');
  });

  // PRIMITIVES.md row `ledger-table`: real table semantics were the precondition for the daisy
  // `table` class swap — the previous CSS-grid of `<div role="table">` could not be styled by it.
  it('renders real table semantics with daisy table classes', () => {
    render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        totals={{ name: 'TOTAL', amount: '$20.50' }}
      />
    );

    const table = screen.getByRole('table');
    expect(table.tagName).toBe('TABLE');
    expect(table).toHaveClass('table', 'table-xs');
    expect(table).not.toHaveClass('table-zebra');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.querySelector('tfoot')).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Name' }).tagName).toBe('TH');
    expect(screen.getByText('ci-deploy').tagName).toBe('TD');
  });

  it('turns each column width into a colgroup track', () => {
    render(
      <LedgerTable
        columns={[{ ...columns[0], width: '220px' }, columns[1]]}
        data={rows}
        rowKey={(row) => row.id}
        renderRowActions={() => <button type="button">Revoke</button>}
      />
    );

    const cols = screen.getByRole('table').querySelectorAll('colgroup > col');
    // one per column, plus the actions track
    expect(cols).toHaveLength(3);
    expect((cols[0] as HTMLElement).style.width).toBe('220px');
    expect((cols[1] as HTMLElement).style.width).toBe('');
  });

  it('renders skeleton rows instead of data when loading', () => {
    const { container } = render(
      <LedgerTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        loading
        loadingRowCount={3}
      />
    );

    expect(screen.queryByText('ci-deploy')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
