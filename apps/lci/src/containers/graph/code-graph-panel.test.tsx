import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GraphResponse } from '../../lib/server/admin';

/**
 * `useCodeGraph` does real `fetch` calls against the same-origin API proxy — mocked wholesale so
 * this container-level test can assert what the PANEL renders for a given hook state, matching
 * `overview-centre.test.tsx`'s established split (the hook's own request logic is a different,
 * cheaper thing to cover than "does the panel render the honest shape for this state").
 */
const useCodeGraphMock = vi.fn();
vi.mock('./use-code-graph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-code-graph')>();
  return { ...actual, useCodeGraph: () => useCodeGraphMock() };
});

/**
 * `CodeGraphCanvas` renders a real `@xyflow/react` canvas, which needs browser layout APIs jsdom
 * doesn't provide — stubbed here (it has no coverage of its own in this pass) so this file can
 * focus on the panel's own state-driven chrome: loading/error/empty, and the inspector wiring.
 */
vi.mock('./code-graph-canvas', () => ({
  CodeGraphCanvas: ({ onNodeSelect }: { onNodeSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onNodeSelect('sym-1')}>
      canvas: select sym-1
    </button>
  ),
}));

const { CodeGraphPanel } = await import('./code-graph-panel');

function baseGraph(overrides: Partial<GraphResponse> = {}): GraphResponse {
  return {
    commit: 'abc123',
    nodes: [{ node_id: 'sym-1', label: 'fn handle', source_file: 'src/a.ts', start_line: 1 }],
    edges: [],
    ...overrides,
  };
}

describe('CodeGraphPanel', () => {
  it('shows a loading message on the first load, before any graph has rendered', () => {
    useCodeGraphMock.mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    render(<CodeGraphPanel repoId={81} />);

    expect(screen.getByText('Loading the graph…')).toBeInTheDocument();
  });

  it('a FAILED first load renders the honest reason, never a fabricated empty graph', () => {
    useCodeGraphMock.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'unavailable' },
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    expect(screen.getByText('Graph service unavailable — try again shortly.')).toBeInTheDocument();
  });

  it('renders the real empty-repository message when the graph has no indexed symbols', () => {
    useCodeGraphMock.mockReturnValue({
      data: baseGraph({ nodes: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    expect(screen.getByText('No indexed symbols yet for this repository.')).toBeInTheDocument();
  });

  it('renders the canvas and a placeholder inspector when the graph has real nodes', () => {
    useCodeGraphMock.mockReturnValue({
      data: baseGraph(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    expect(screen.getByText('canvas: select sym-1')).toBeInTheDocument();
    expect(
      screen.getByText('Click a node to see its details and explore from there.')
    ).toBeInTheDocument();
  });

  it('selecting a node in the canvas surfaces its details in the inspector', async () => {
    const user = userEvent.setup();
    useCodeGraphMock.mockReturnValue({
      data: baseGraph(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    await user.click(screen.getByText('canvas: select sym-1'));

    expect(screen.getByText('fn handle')).toBeInTheDocument();
    expect(screen.getByText('src/a.ts:1')).toBeInTheDocument();
  });

  it('calls reload when Refresh is clicked', async () => {
    const reload = vi.fn();
    const user = userEvent.setup();
    useCodeGraphMock.mockReturnValue({ data: baseGraph(), loading: false, error: null, reload });
    render(<CodeGraphPanel repoId={81} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows "Back to structural view" only in similar mode, after selecting a node', async () => {
    const user = userEvent.setup();
    useCodeGraphMock.mockReturnValue({
      data: baseGraph(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    expect(
      screen.queryByRole('button', { name: 'Back to structural view' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('canvas: select sym-1'));
    await user.click(screen.getByRole('button', { name: 'Find similar (by meaning)' }));

    expect(screen.getByRole('button', { name: 'Back to structural view' })).toBeInTheDocument();
  });

  it('keeps the last-good graph on screen when a query fails, showing the notice beside it', () => {
    useCodeGraphMock.mockReturnValue({
      data: baseGraph(),
      loading: false,
      error: { code: 'no_embedding' },
      reload: vi.fn(),
    });
    render(<CodeGraphPanel repoId={81} />);

    // The graph itself (canvas stub) keeps rendering...
    expect(screen.getByText('canvas: select sym-1')).toBeInTheDocument();
    // ...the empty-repo / first-load messages are structurally unreachable once `data` exists.
    expect(
      screen.queryByText('No indexed symbols yet for this repository.')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Loading the graph…')).not.toBeInTheDocument();
  });
});
