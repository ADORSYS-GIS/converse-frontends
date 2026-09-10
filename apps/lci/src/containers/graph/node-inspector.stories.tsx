// The side panel beside the code graph: which symbol is selected, the two actions that move the
// view, and — when the last action produced a reason rather than a result — one short line saying
// why.
//
// The notice states are the reason this component is worth its own story. A failed "find similar"
// must NOT blank the graph: it degrades to a line in this box while the previous graph stays on
// screen, and `similarActive` stays false, because a button that reads as pressed for a result
// nobody can see is a lie.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { NodeInspector } from './node-inspector';
import { GRAPH } from '../story-fixtures';

const NODE = GRAPH.nodes[3];

const meta = {
  title: 'LCI/NodeInspector',
  component: NodeInspector,
  args: {
    node: NODE,
    onExpand: () => {},
    onFindSimilar: () => {},
    similarActive: false,
  },
  decorators: [
    (Story) => (
      <div className="border-border bg-surface w-[260px] rounded-lg border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** Nothing selected yet — the box explains what to do instead of sitting blank. */
export const NoSelection: Story = { args: { node: null } };

/** "Find similar" succeeded and is the view currently on screen. */
export const SimilarActive: Story = { args: { similarActive: true } };

/**
 * The expected non-result: this symbol has no stored embedding, so there is nothing to compare
 * against. `muted`, not `attention` — it is an outcome, not a failure.
 */
export const NoEmbedding: Story = {
  args: {
    notice: { tone: 'muted', message: 'No stored embedding for this symbol yet.' },
  },
};

/** A real failure reads `attention`. */
export const QueryFailed: Story = {
  args: {
    notice: { tone: 'attention', message: "Couldn't load the graph." },
  },
};

/** A long symbol path wraps rather than overflowing the 260px rail. */
export const LongSymbolName: Story = {
  args: {
    node: {
      ...NODE,
      label: 'lightbridge_authz_core::authz::grants::expansion::expand_grant_with_wildcards',
      source_file: 'crates/lightbridge-authz-core/src/authz/grants/expansion.rs',
    },
  },
};
