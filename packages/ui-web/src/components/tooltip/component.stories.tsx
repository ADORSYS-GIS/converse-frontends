import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tooltip, TooltipGroup } from './component';
import { Button } from '../button';
import { LABEL_CLASS } from '../../lib/type-roles';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-muted flex min-h-[220px] items-center justify-center p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

/** The default anchor: a non-interactive label that would otherwise have no affordance at all. */
export const Default: Story = {
  args: {
    content: 'Requests billed against this key between 1 and 29 August',
    children: <span className="text-soft font-mono text-xs">Billed requests</span>,
  },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Default.args,
};

/**
 * The case that motivated the primitive: a ledger cell clipped by its own column. The tooltip
 * portals, so it is not clipped by the `overflow-x-auto` container the ledger scrolls inside —
 * which is precisely what daisy's CSS-only `data-tip` tooltip could not do.
 */
export const TruncatedCell: Story = {
  render: () => (
    <div className="bg-surface w-[220px] overflow-x-auto p-4">
      <div className={LABEL_CLASS}>Project</div>
      <Tooltip content="gateway-prod-eu-central-1-failover">
        <span className="text-soft block truncate font-mono text-xs">
          gateway-prod-eu-central-1-failover
        </span>
      </Tooltip>
    </div>
  ),
};

/** An icon-only button: already focusable, so it keeps its single tab stop. */
export const IconButton: Story = {
  render: () => (
    <Tooltip content="Copy key id" side="bottom">
      <Button variant="ghost" size="icon" aria-label="Copy key id">
        ⧉
      </Button>
    </Tooltip>
  ),
};

/**
 * A row of triggers sharing one delay: hovering the first waits, its neighbours then open
 * instantly rather than each serving its own 600ms.
 */
export const Grouped: Story = {
  render: () => (
    <TooltipGroup delay={300}>
      <div className="flex items-center gap-6">
        {[
          ['p50', 'Median latency'],
          ['p95', '95th percentile latency'],
          ['p99', '99th percentile latency'],
        ].map(([short, long]) => (
          <Tooltip key={short} content={long}>
            <span className="text-soft font-mono text-xs">{short}</span>
          </Tooltip>
        ))}
      </div>
    </TooltipGroup>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} content={`Anchored ${side}`} side={side}>
          <span className="text-soft border-border rounded-[2px] border px-2 py-1 font-mono text-xs">
            {side}
          </span>
        </Tooltip>
      ))}
    </div>
  ),
};

/** No content: the child renders exactly as passed, with no trigger wiring and no tab stop. */
export const NoContent: Story = {
  args: {
    content: undefined,
    children: <span className="text-subtle font-mono text-xs">Nothing to explain</span>,
  },
};
