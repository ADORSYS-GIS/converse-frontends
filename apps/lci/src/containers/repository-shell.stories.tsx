// The chrome every `/repositories/[id]/*` route renders inside: title, approval status and the
// approve/deny actions (which act on the repository, so they stay reachable from every tab), plus
// the Overview/Graph/Settings tab strip.
//
// `withPathname` is what makes the tab strip honest — `RepoTabsNav` matches the tab EXACTLY (a
// prefix match would light Overview on every nested route), so a story that does not pin the
// pathname would always show Overview active.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { repository, withPagePadding, withPathname } from './story-fixtures';
import { RepositoryShell } from './repository-shell';

const BODY = (
  <div className="border-border text-subtle rounded-lg border border-dashed p-8 text-center text-sm">
    the active tab&rsquo;s content renders here
  </div>
);

const meta = {
  title: 'Pages/LCI/RepositoryShell',
  component: RepositoryShell,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { id: 1, repo: repository(), canApprove: true, canDeny: true, children: BODY },
} satisfies Meta<typeof RepositoryShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Approved repository, Overview tab. Only Deny is offered — Approve would be a no-op. */
export const Default: Story = {
  decorators: [withPathname('/repositories/1')],
};

export const Wireframe: Story = {
  decorators: [withPathname('/repositories/1')],
  globals: { theme: 'wireframe' },
};

/** Graph tab active — proves the exact-match rule, since `/repositories/1` is its prefix. */
export const GraphTab: Story = {
  decorators: [withPathname('/repositories/1/graph')],
};

export const SettingsTab: Story = {
  decorators: [withPathname('/repositories/1/settings')],
};

/** Pending approval: `attention` status, and both actions offered. */
export const Pending: Story = {
  args: { repo: repository({ status: 'pending', approved_at: null, approved_by: null }) },
  decorators: [withPathname('/repositories/1')],
};

/** No approval grants — the status still reads, the buttons are simply absent. */
export const ReadOnly: Story = {
  args: { canApprove: false, canDeny: false },
  decorators: [withPathname('/repositories/1')],
};

export const Mobile: Story = {
  decorators: [withPathname('/repositories/1')],
  globals: { viewport: { value: 'base390' } },
};
