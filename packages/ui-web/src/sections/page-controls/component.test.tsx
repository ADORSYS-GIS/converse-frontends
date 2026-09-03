import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageControls } from './component';

const RANGE_GROUP = { id: 'window', label: 'Time window', children: <button>Last 30 days</button> };
const SLICE_GROUP = { id: 'slice', label: 'Slice', children: <button>By project</button> };

describe('PageControls', () => {
  it('names the row and every group, so the grouping survives without the hairlines', () => {
    render(<PageControls label="Filters" groups={[RANGE_GROUP, SLICE_GROUP]} />);

    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Time window' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Slice' })).toBeInTheDocument();
  });

  it('draws one divider between groups and none before the first', () => {
    const { container } = render(<PageControls groups={[RANGE_GROUP, SLICE_GROUP]} />);
    expect(container.querySelectorAll('.page-controls-divider')).toHaveLength(1);
  });

  // A rule immediately left of a group that has flown to the far edge hangs in space with nothing
  // on its right — the width of the row is already the separation.
  it('draws no divider before the group that claims the trailing edge', () => {
    const { container } = render(
      <PageControls groups={[RANGE_GROUP, { ...SLICE_GROUP, align: 'end' }]} />
    );
    expect(container.querySelectorAll('.page-controls-divider')).toHaveLength(0);
  });

  it('renders nothing at all when there is neither a group nor a reset', () => {
    const { container } = render(<PageControls groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the reset affordance only when a caller passes one', () => {
    const { rerender } = render(<PageControls groups={[RANGE_GROUP]} />);
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();

    const onReset = vi.fn();
    rerender(<PageControls groups={[RANGE_GROUP]} onReset={onReset} />);
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });

  it('calls onReset when the reset affordance is pressed', () => {
    const onReset = vi.fn();
    render(<PageControls groups={[RANGE_GROUP]} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  // Flexbox splits free space between every element claiming `margin-inline-start: auto`, so a
  // second `end` group would land a third of the way across instead of at the edge.
  it('marks only the first end-aligned group as the one that claims the trailing edge', () => {
    const { container } = render(
      <PageControls
        groups={[
          RANGE_GROUP,
          { ...SLICE_GROUP, align: 'end' },
          { id: 'paging', label: 'Rows per page', align: 'end', children: <button>25</button> },
        ]}
      />
    );

    const ends = container.querySelectorAll('.page-controls-group[data-align="end"]');
    expect(ends).toHaveLength(1);
    expect(ends[0]).toHaveAttribute('data-group', 'slice');
  });

  it('puts the reset group last, on the trailing edge', () => {
    const { container } = render(<PageControls groups={[RANGE_GROUP]} onReset={() => {}} />);

    const groups = container.querySelectorAll('.page-controls-group');
    const last = groups[groups.length - 1];
    expect(last).toHaveAttribute('data-group', 'reset');
    expect(last).toHaveAttribute('data-align', 'end');
  });
});
