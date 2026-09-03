// The agent's persisted review for one run.
//
// Two rules are worth looking at rather than reading: a finding is a `<details>` disclosure only
// when it HAS detail (a bare row renders flat, never an empty expander), and it opens by default
// when it is P0 or `security` — so the thing that blocks a merge is never one click away. Priority
// and category are `StatusText`, never pills (`docs/design/lci-app/PRIMITIVES.md`, the
// `status-pill.tsx` rebuild row).
import type { Meta, StoryObj } from '@storybook/react-vite';

import { REVIEW } from './story-fixtures';
import { ReviewOutput } from './review-output';

const meta = {
  title: 'LCI/ReviewOutput',
  component: ReviewOutput,
  args: { review: REVIEW, repoPlatform: 'github' },
} satisfies Meta<typeof ReviewOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** P0 security (open), P1 correctness (open — it has a suggestion), and a bare P2 row. */
export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** GitLab repo — only the outbound link's label changes. */
export const GitLab: Story = { args: { repoPlatform: 'gitlab' } };

/** A clean run: the summary and the counts, and no findings list at all. */
export const NoFindings: Story = {
  args: {
    review: {
      ...REVIEW,
      summary: 'No blocking findings. The change is scoped and the tests cover the new branch.',
      inline_count: 0,
      deferred_count: 0,
      out_of_scope_count: 0,
      findings: [],
    },
  },
};

/**
 * Rows that predate the priority/category model: only `severity`. `priorityOf`/`categoryOf` map
 * them (`error` → P0, `warning` → P1, everything else → P2, category defaults to `correctness`),
 * so an old row still reads like a new one.
 */
export const LegacySeverityOnly: Story = {
  args: {
    review: {
      ...REVIEW,
      summary: 'Imported from a review written before the priority model landed.',
      review_url: null,
      findings: [
        {
          file: 'src/db.rs',
          line: 88,
          severity: 'error',
          title: 'Unbounded query on the tasks table',
          body: 'listTasks() selects every row before paging in memory.',
        },
        {
          file: 'src/db.rs',
          line: 140,
          severity: 'warning',
          title: 'Missing index on repository_id',
          body: '',
        },
      ],
    },
  },
};
