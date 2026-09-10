// The `@xyflow/react` + dagre code-graph canvas — ADR 0014's one genuinely novel LCI surface, and
// explicitly app-local (no `ui-web`/`chart-core` primitive has anything to offer a node-link
// graph).
//
// The canvas is a pure renderer: layout and styling in, a node-click callback out. `CodeGraphPanel`
// around it is not storied — everything it adds is a `fetch` against `/api/repositories/…`, which
// a story can only ever show failing.
//
// The canvas sizes itself to the viewport space beneath it (ADR 0014's one local addition over the
// upstream fixed height), so these stories are `fullscreen` — a padded layout would measure wrong.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeGraphCanvas } from './code-graph-canvas';
import { GRAPH } from '../story-fixtures';

const meta = {
  title: 'LCI/CodeGraphCanvas',
  component: CodeGraphCanvas,
  parameters: { layout: 'fullscreen' },
  args: { data: GRAPH, onNodeSelect: () => {} },
} satisfies Meta<typeof CodeGraphCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One module, its two types and two functions — `contains` edges recede, `calls` reads. */
export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** A selected node takes the selection border without the layout being recomputed. */
export const NodeSelected: Story = {
  args: { selectedNodeId: 'n4' },
};

/**
 * The label-overflow case ADR 0014 names: a long, unbroken Rust symbol path clips to its node with
 * an ellipsis and carries the full name in a hover tooltip, rather than bleeding over its
 * neighbours.
 */
export const LongSymbolNames: Story = {
  args: {
    data: {
      ...GRAPH,
      nodes: GRAPH.nodes.map((node) => ({
        ...node,
        label: `lightbridge_authz_core::authz::grants::expansion::${node.label.split('::').pop()}`,
      })),
    },
  },
};

/** A single node, no edges — the freshly-indexed case. */
export const SingleNode: Story = {
  args: { data: { ...GRAPH, nodes: [GRAPH.nodes[0]], edges: [] } },
};
