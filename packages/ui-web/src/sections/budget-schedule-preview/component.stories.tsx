import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../../components/bottom-sheet';
import { BudgetSchedulePreview, PREVIEW_ENTRY_LIMIT } from './component';
import { budgetSchedulePreviewEntries } from './fixtures';

// The dry-run preview, rendered where the real route renders it: inside a `BottomSheet`, which is
// this console's one row/detail surface at every tier (ADR 0013 D5).
//
// `runBudgetResetScheduleNow { dryRun: true }` and the real tick are the same code path with one
// boolean flipped, so this list is the plan, not an estimate — which is why the sheet leads with a
// sentence saying so.

function PreviewSheet(props: React.ComponentProps<typeof BudgetSchedulePreview>) {
  return (
    <div className="p-6">
      <BottomSheet
        open
        onOpenChange={() => {}}
        title="Preview — estate-daily-reset"
        subtitle="Reset remaining to $2.00 every day at 00:00 UTC">
        <BudgetSchedulePreview {...props} />
      </BottomSheet>
    </div>
  );
}

const meta: Meta<typeof PreviewSheet> = {
  title: 'Sections/BudgetSchedulePreview',
  component: PreviewSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    status: 'ready',
    dryRun: true,
    windowLabel: '2 Sep 2026, 00:00 UTC',
    entries: budgetSchedulePreviewEntries,
    totalEntryCount: budgetSchedulePreviewEntries.length,
    entryLimit: PREVIEW_ENTRY_LIMIT,
    deferredCount: 0,
    supersededCount: 0,
  },
};

export default meta;
type Story = StoryObj<typeof PreviewSheet>;

// Note the second row: a NEGATIVE change. That is the owner's "reset clamps both ways" ruling made
// visible — the account is above the target, so the schedule books a refund-type correction to
// bring it down. It is the single most surprising thing this feature does, and the preview is
// where an operator is supposed to meet it.
export const DryRun: Story = { name: 'Dry run — the plan, including the clamp-downs' };

export const DryRunLight: Story = {
  name: 'Dry run — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Truncated: Story = {
  name: 'Truncated — the first 25 of 137, stated',
  args: { totalEntryCount: 137 },
};

export const WithDeferredAndSuperseded: Story = {
  name: 'Deferred and superseded accounts, counted rather than dropped',
  args: { totalEntryCount: 137, deferredCount: 3, supersededCount: 11 },
};

export const NothingToDo: Story = {
  name: 'Nothing would change — an explained empty plan, not an empty table',
  args: { entries: [], totalEntryCount: 0 },
};

export const AfterRunNow: Story = {
  name: 'After Run now — the same shape, the opposite sentence',
  args: { dryRun: false },
};

export const Loading: Story = {
  name: 'The dry run is in flight',
  args: { status: 'loading', entries: [], totalEntryCount: 0 },
};

export const Failed: Story = {
  name: 'The dry run failed — retryable, never an empty plan',
  args: {
    status: 'error',
    entries: [],
    totalEntryCount: 0,
    errorMessage: 'Forbidden — this session does not hold budget:schedule-manage.',
  },
};

export const FailedLight: Story = {
  name: 'The dry run failed — wireframe (light)',
  args: {
    status: 'error',
    entries: [],
    totalEntryCount: 0,
    errorMessage: 'Forbidden — this session does not hold budget:schedule-manage.',
  },
  globals: { theme: 'wireframe' },
};
