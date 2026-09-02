import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GraphSymbol } from '../../lib/server/admin';
import { NodeInspector } from './node-inspector';

function baseNode(overrides: Partial<GraphSymbol> = {}): GraphSymbol {
  return {
    node_id: 'sym-1',
    label: 'fn handleRequest',
    source_file: 'src/handler.ts',
    start_line: 12,
    ...overrides,
  };
}

describe('NodeInspector', () => {
  it('prompts to select a node when none is selected, with no identity or actions shown', () => {
    render(
      <NodeInspector node={null} onExpand={vi.fn()} onFindSimilar={vi.fn()} similarActive={false} />
    );

    expect(
      screen.getByText('Click a node to see its details and explore from there.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the selected node identity and both actions', () => {
    render(
      <NodeInspector
        node={baseNode()}
        onExpand={vi.fn()}
        onFindSimilar={vi.fn()}
        similarActive={false}
      />
    );

    expect(screen.getByText('fn handleRequest')).toBeInTheDocument();
    expect(screen.getByText('src/handler.ts:12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand neighborhood' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find similar (by meaning)' })).toBeInTheDocument();
  });

  it('calls onExpand and onFindSimilar from their own buttons', async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    const onFindSimilar = vi.fn();
    render(
      <NodeInspector
        node={baseNode()}
        onExpand={onExpand}
        onFindSimilar={onFindSimilar}
        similarActive={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand neighborhood' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onFindSimilar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Find similar (by meaning)' }));
    expect(onFindSimilar).toHaveBeenCalledTimes(1);
  });

  it('renders a notice line when one is given, and none when omitted', () => {
    const { rerender } = render(
      <NodeInspector
        node={baseNode()}
        onExpand={vi.fn()}
        onFindSimilar={vi.fn()}
        similarActive={false}
        notice={{ tone: 'attention', message: 'No stored embedding for this symbol yet.' }}
      />
    );
    expect(screen.getByText('No stored embedding for this symbol yet.')).toBeInTheDocument();

    rerender(
      <NodeInspector
        node={baseNode()}
        onExpand={vi.fn()}
        onFindSimilar={vi.fn()}
        similarActive={false}
        notice={null}
      />
    );
    expect(screen.queryByText('No stored embedding for this symbol yet.')).not.toBeInTheDocument();
  });
});
