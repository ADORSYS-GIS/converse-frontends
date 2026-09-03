// `/repositories` — the searchable, cursor-paged repository ledger.
//
// Search and paging are URL state (`nuqs`, `shallow: false`), so this story mounts the real
// browser adapter: typing in the search field really does rewrite the preview iframe's query
// string. What it cannot do is re-fetch — the server component owns that — so `Filtered` passes
// the already-filtered page the app would have received, with `q` set to match.
//
// Since converse-frontends#504 (ADR 0015 amendment A2, owner directive "filters are outside
// cards") the search box lives in a `PageControls` row on the FLOOR between the title and the
// ledger's `Card`, not in a toolbar inside the card it filters. Two stories carry the consequences:
// `NoMatches` is the only one with a search actually applied, so it is the only one that draws
// `Reset filters`; `Unavailable` shows the row outliving the table it narrows.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RepositoriesCentre } from './repositories-centre';
import { NOW, REPOSITORIES, withNuqs, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Repositories',
  component: RepositoriesCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: { now: NOW, q: '' },
} satisfies Meta<typeof RepositoriesCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All four approval states at once — approved, pending, disabled, and a GitLab repo. */
export const Default: Story = {
  args: {
    result: {
      ok: true,
      data: { repositories: REPOSITORIES, total: REPOSITORIES.length, next: null, prev: null },
    },
  },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** Mid-ledger: both directions live, so `Pagination` renders both controls. */
export const Paged: Story = {
  args: {
    result: {
      ok: true,
      data: {
        repositories: REPOSITORIES,
        total: 37,
        next: { activity_at: '2026-08-30T09:00:00.000Z', id: 9 },
        prev: { activity_at: '2026-09-02T09:00:00.000Z', id: 4 },
      },
    },
  },
};

/** A search that matched nothing — the empty line quotes the query back, and `Reset filters`
 *  appears in the control row, which it does not in any story where nothing is being narrowed. */
export const NoMatches: Story = {
  args: {
    q: 'kubernetes',
    result: { ok: true, data: { repositories: [], total: 0, next: null, prev: null } },
  },
};

/** Nothing connected yet. Different copy from `NoMatches`, on purpose. */
export const Empty: Story = {
  args: {
    result: { ok: true, data: { repositories: [], total: 0, next: null, prev: null } },
  },
};

export const Unavailable: Story = {
  args: { result: { ok: false, reason: 'unavailable' } },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
