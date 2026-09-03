import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { RefineProjectsScreen } from './refine-projects-screen';
import { withRefineMock } from './refine-decorator';

// Demonstrates the real `@refinedev/core` wiring (useTable → the Projects sections) that
// `apps/console` will use verbatim once it swaps in `@cratestack/refine`'s generated data
// provider — console-ui skill "Refine-driven mock screens" / docs/adr/0009-nextjs-console-
// replacement.md Decision 4.
const meta: Meta<typeof RefineProjectsScreen> = {
  title: 'Refine/Projects',
  component: RefineProjectsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RefineProjectsScreen>;

// `useTable` starts loading (LedgerTable skeleton), then the mock provider resolves after ~300-600ms
// and the real 12-row ledger renders — the live loading→populated transition named in the task.
export const Populated: Story = {
  decorators: [withRefineMock({ latencyMs: [300, 600] })],
  render: () => (
    <div className="w-full">
      <RefineProjectsScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('gateway-prod')).toBeInTheDocument(), {
      timeout: 3000,
    });
  },
};

// Selecting a row opens `DetailSheet` hosting `ProjectDetail` (shell revamp phase 3 — selection
// no longer retargets a persistent right rail), driven entirely by `useTable`'s live
// `result.data` plus the container's own selection state.
export const RowSelected: Story = {
  decorators: [withRefineMock({ latencyMs: [10, 20] })],
  render: () => (
    <div className="w-full">
      <RefineProjectsScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('gateway-prod')).toBeInTheDocument(), {
      timeout: 3000,
    });

    const rows = canvas.getAllByRole('row').slice(1);
    rows[0].click();

    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

// The `projects` resource rejects every `getList` call — `ErrorLine` + Retry renders in place of
// the ledger, exactly like the fixture-driven `Pages/Projects`'s `ErrorState` story.
export const ErrorMode: Story = {
  decorators: [
    withRefineMock({
      latencyMs: [10, 20],
      errorResources: { projects: 'Failed to load projects for this account.' },
    }),
  ],
  render: () => (
    <div className="w-full">
      <RefineProjectsScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () =>
        expect(canvas.getByRole('alert')).toHaveTextContent(
          'Failed to load projects for this account.'
        ),
      {
        timeout: 3000,
      }
    );
  },
};
