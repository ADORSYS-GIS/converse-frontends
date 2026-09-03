// The Overview/Graph/Settings tab strip for one repository, on `ui-web`'s `SubNav` (the
// `docs/design/lci-app/PRIMITIVES.md` "class swap" row for LCI's own `repo-tabs.tsx`).
//
// Its whole behaviour is which tab is active, and that is derived from `usePathname()` — so every
// story here is one pathname.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RepoTabsNav } from './repo-tabs-nav';
import { withPathname } from './story-fixtures';

const meta = {
  title: 'LCI/RepoTabsNav',
  component: RepoTabsNav,
  args: { id: 1 },
} satisfies Meta<typeof RepoTabsNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { decorators: [withPathname('/repositories/1')] };
export const Graph: Story = { decorators: [withPathname('/repositories/1/graph')] };
export const Settings: Story = { decorators: [withPathname('/repositories/1/settings')] };

export const Wireframe: Story = {
  decorators: [withPathname('/repositories/1/graph')],
  globals: { theme: 'wireframe' },
};

/**
 * An unrelated path: nothing is active. Worth a story because the alternative implementation
 * (prefix matching) would light Overview here, which is exactly the bug the exact match avoids.
 */
export const NoTabActive: Story = { decorators: [withPathname('/runs')] };
