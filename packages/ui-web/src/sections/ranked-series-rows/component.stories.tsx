import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RankedSeriesRows } from './component';
import {
  rankedRowsDominantModel,
  rankedRowsEmpty,
  rankedRowsEstateAccounts,
  rankedRowsSentinelUsers,
  rankedRowsSparseAccount,
} from './fixtures';

const meta: Meta<typeof RankedSeriesRows> = {
  title: 'Sections/RankedSeriesRows',
  component: RankedSeriesRows,
  parameters: { layout: 'fullscreen' },
  args: {
    rows: rankedRowsEstateAccounts,
    otherLabel: (count: number) => `Other (${count} accounts)`,
  },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6" style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RankedSeriesRows>;

/** 10 accounts against the default `topN` of 8 — two fold into "Other," rank-4 grey, unselectable. */
export const EstateOverflow: Story = {};

export const EstateOverflowLight: Story = {
  name: 'Estate overflow — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Sorted by the size of the change instead of by spend — same bucket, different reading order. */
export const SortedByDelta: Story = {
  args: { sortMode: 'delta' },
};

/**
 * One model at ~97% of spend — the measured common case ("top-1 ≥95% for half of accounts"). The
 * share micro-bar is suppressed everywhere in this list in favour of a plain percentage.
 */
export const DominantModel: Story = {
  args: { rows: rankedRowsDominantModel, otherLabel: (count: number) => `Other (${count} models)` },
};

/** A sparse account: real spend on two models, three genuinely at $0 this period — the zero tail
 *  collapses behind one collapsed disclosure line rather than three dead rows. */
export const SparseAccount: Story = {
  args: { rows: rankedRowsSparseAccount, otherLabel: (count: number) => `Other (${count} models)` },
};

/** Sentinel identities render with their resolved, de-emphasized label — never a raw `missing:…`
 *  key or a bare `-`. */
export const SentinelUsers: Story = {
  args: {
    rows: rankedRowsSentinelUsers.map((row) =>
      row.key.startsWith('missing:') || row.key === '-' ? { ...row, subtle: true } : row
    ),
  },
};

export const Selected: Story = {
  args: { selectedKey: 'acct_2', onSelect: () => undefined },
};

export const Empty: Story = {
  args: { rows: rankedRowsEmpty, emptyMessage: 'No usage in this range.' },
};
