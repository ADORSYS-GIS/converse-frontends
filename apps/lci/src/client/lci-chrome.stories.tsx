// The left sidebar every `apps/lci` screen shares — real `LciSidebarContent`, not a stand-in, so
// a story reviewer sees the actual nav glyphs (`RunsIcon` and friends) the app ships.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { withPathname } from '../containers/story-fixtures';
import { LciSidebarContent } from './lci-chrome';

const meta = {
  title: 'LCI/LciChrome',
  component: LciSidebarContent,
  parameters: { layout: 'fullscreen' },
  args: {
    userLabel: 'Ada Lovelace',
    onOpenPalette: () => {},
    hasLogo: false,
    hasLogoLight: false,
  },
  decorators: [withPathname('/')],
} satisfies Meta<typeof LciSidebarContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: (args) => (
    <div className="h-[640px]">
      <LciSidebarContent {...args} />
    </div>
  ),
};

export const Runs: Story = {
  ...Overview,
  decorators: [withPathname('/runs')],
};

export const Wireframe: Story = {
  ...Overview,
  globals: { theme: 'wireframe' },
};
