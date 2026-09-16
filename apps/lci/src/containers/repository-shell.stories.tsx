// The chrome every `/repositories/[id]/*` route renders inside: title, approval status, and the
// Overview/Graph/Settings tab strip.
//
// Since converse-frontends#504 (ADR 0015 amendment A2) status is a trailing `PageControls` group
// rather than `PageHeader.controls`, which no longer exists — the title row carries a title and at
// most one action.
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
  args: { id: 1, repo: repository(), children: BODY },
} satisfies Meta<typeof RepositoryShell>;

export default meta;
type Story = StoryObj<typeof meta>;

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

/** Pending approval: `attention` status tone. */
export const Pending: Story = {
  args: { repo: repository({ status: 'pending', approved_at: null, approved_by: null }) },
  decorators: [withPathname('/repositories/1')],
};

export const Mobile: Story = {
  decorators: [withPathname('/repositories/1')],
  globals: { viewport: { value: 'base390' } },
};
