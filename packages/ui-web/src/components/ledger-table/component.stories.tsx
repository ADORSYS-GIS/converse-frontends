import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorLine } from '../error-line';
import { InlineStatus } from '../inline-status';
import { RowActionGroup } from '../row-action-group';
import { StatusText } from '../status-text';
import { LedgerTable } from './component';
import type { LedgerColumn } from './types';

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'expiring' | 'revoked';
  statusLabel: string;
  created: string;
  lastUsed: string;
  expires: string;
}

// api-keys.svg — the 11-row ledger shown in the mockup.
const apiKeys: ApiKeyRow[] = [
  { id: 'ci-deploy', name: 'ci-deploy', prefix: 'lb_live_a91f…', status: 'active', statusLabel: 'active', created: '2026-01-04', lastUsed: '2 min ago', expires: '2026-09-04' },
  { id: 'gateway-edge', name: 'gateway-edge', prefix: 'lb_live_77c2…', status: 'active', statusLabel: 'active', created: '2025-11-19', lastUsed: '41 min ago', expires: 'no expiry' },
  { id: 'batch-eval', name: 'batch-eval', prefix: 'lb_live_0d5e…', status: 'expiring', statusLabel: 'expiring', created: '2025-08-02', lastUsed: '6 h ago', expires: '2026-03-02' },
  { id: 'legacy-import', name: 'legacy-import', prefix: 'lb_live_3b8a…', status: 'revoked', statusLabel: 'revoked', created: '2025-05-30', lastUsed: '2025-12-11', expires: '—' },
  { id: 'analytics-ro', name: 'analytics-ro', prefix: 'lb_live_c4f1…', status: 'active', statusLabel: 'active', created: '2026-02-02', lastUsed: '3 d ago', expires: '2026-08-02' },
  { id: 'sandbox', name: 'sandbox', prefix: 'lb_live_9e7d…', status: 'active', statusLabel: 'active', created: '2026-02-14', lastUsed: 'never used', expires: '2026-05-14' },
  { id: 'eval-harness', name: 'eval-harness', prefix: 'lb_live_5a2c…', status: 'active', statusLabel: 'active', created: '2026-02-18', lastUsed: '12 h ago', expires: '2026-08-18' },
  { id: 'webhook-relay', name: 'webhook-relay', prefix: 'lb_live_e610…', status: 'active', statusLabel: 'active', created: '2025-09-08', lastUsed: '4 min ago', expires: 'no expiry' },
  { id: 'staging-sync', name: 'staging-sync', prefix: 'lb_live_2f9b…', status: 'active', statusLabel: 'active', created: '2025-12-22', lastUsed: '1 d ago', expires: '2026-06-22' },
  { id: 'old-ci', name: 'old-ci', prefix: 'lb_live_8c34…', status: 'revoked', statusLabel: 'revoked', created: '2025-03-14', lastUsed: '2025-10-02', expires: '—' },
  { id: 'partner-readonly', name: 'partner-readonly', prefix: 'lb_live_b7e5…', status: 'active', statusLabel: 'active', created: '2026-01-27', lastUsed: '9 d ago', expires: '2027-01-27' },
];

const statusTone = (status: ApiKeyRow['status']): 'active' | 'muted' | 'attention' =>
  status === 'active' ? 'active' : status === 'expiring' ? 'attention' : 'muted';

const columns: LedgerColumn<ApiKeyRow>[] = [
  { key: 'name', header: 'Name', width: '220px', accessor: (row) => <span className="text-ink">{row.name}</span> },
  { key: 'prefix', header: 'Prefix', width: '160px', accessor: (row) => row.prefix },
  {
    key: 'status',
    header: 'Status',
    width: '110px',
    accessor: (row) => <StatusText tone={statusTone(row.status)}>{row.statusLabel}</StatusText>,
  },
  { key: 'created', header: 'Created', width: '110px', align: 'right', accessor: (row) => row.created },
  { key: 'lastUsed', header: 'Last used', width: '120px', align: 'right', accessor: (row) => row.lastUsed },
  { key: 'expires', header: 'Expires', width: '110px', align: 'right', accessor: (row) => row.expires },
];

const meta: Meta<typeof LedgerTable> = {
  title: 'Data display/LedgerTable',
};

export default meta;
type Story = StoryObj<typeof LedgerTable>;

export const Default: Story = {
  render: () => <LedgerTable columns={columns} data={apiKeys} rowKey={(row) => row.id} />,
};

export const WithRowActions: Story = {
  render: () => (
    <LedgerTable
      columns={columns}
      data={apiKeys}
      rowKey={(row) => row.id}
      renderRowActions={(row) => (
        <RowActionGroup
          actions={[
            { key: 'rotate', label: 'Rotate', onClick: () => {}, emphasis: 'default' },
            { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong' },
            { key: 'del', label: 'Del', onClick: () => {}, emphasis: 'muted', disabled: row.status === 'revoked' },
          ]}
        />
      )}
    />
  ),
};

export const Selectable: Story = {
  render: () => {
    const SelectableTable = () => {
      const [selected, setSelected] = useState<string[]>(['batch-eval']);
      return (
        <LedgerTable
          columns={columns}
          data={apiKeys}
          rowKey={(row) => row.id}
          selectedRowKeys={selected}
          onSelectRow={(row) => setSelected([row.id])}
        />
      );
    };
    return <SelectableTable />;
  },
};

// Review-queue density (Mercury, 52px rows) — see admin-budget-review.svg pending queue.
export const ReviewDensity: Story = {
  render: () => (
    <LedgerTable columns={columns} data={apiKeys.slice(0, 4)} rowKey={(row) => row.id} density="review" />
  ),
};

export const WithTotalsFooter: Story = {
  render: () => (
    <LedgerTable
      columns={columns}
      data={apiKeys.slice(0, 4)}
      rowKey={(row) => row.id}
      totals={{ name: 'TOTAL · 4 SHOWN', status: <span className="text-ink">3 active</span> }}
    />
  ),
};

// §6 — empty ledger still renders its header row; the InlineStatus lives above it, composed
// by the consumer, not by LedgerTable itself.
export const Empty: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <InlineStatus>No keys in this project yet. Create one from the right.</InlineStatus>
      <LedgerTable columns={columns} data={[]} rowKey={(row) => row.id} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <LedgerTable columns={columns} data={[]} rowKey={(row) => row.id} loading loadingRowCount={6} />
  ),
};

// §6 — section-level errors replace the section's content with one ErrorLine + Retry; the
// header stays so the columns still teach the shape of the data.
export const ErrorState: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ErrorLine message="Failed to load keys for this project." onRetry={() => {}} />
      <LedgerTable columns={columns} data={[]} rowKey={(row) => row.id} />
    </div>
  ),
};
