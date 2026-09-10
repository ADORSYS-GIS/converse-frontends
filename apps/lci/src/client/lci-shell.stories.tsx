// The persistent LCI shell — sidebar, top bar, command palette — mounted exactly once around
// every route.
//
// This is the only story that shows an LCI screen with its real chrome; the `Pages/LCI/*` stories
// deliberately render the screen alone, which is how the route composes it (`app/(lci)/layout.tsx`
// supplies the shell). Both views matter: the shell is where the nav's active row, the brand slot
// and the responsive sidebar/top-bar swap are reviewable, and none of that is visible in a screen
// story.
//
// `ConsoleShell` decides sidebar-vs-top-bar from a CSS media query, not a prop, so the only way to
// see the mobile chrome is to actually resize the preview iframe — hence the `Mobile` variant's
// viewport global rather than a wrapper div.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LciShell } from './lci-shell';
import { NOW, TASKS, withPathname } from '../containers/story-fixtures';
import { OverviewCentre } from '../containers/overview-centre';

const meta = {
  title: 'Pages/LCI/Shell',
  component: LciShell,
  parameters: { layout: 'fullscreen' },
  args: {
    userLabel: 'Ada Lovelace',
    hasLogo: false,
    hasLogoLight: false,
    children: (
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <OverviewCentre result={{ ok: true, data: TASKS }} now={NOW} />
      </div>
    ),
  },
} satisfies Meta<typeof LciShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Overview active. Press ⌘K to open the palette — the shortcut is wired here, not per screen. */
export const Default: Story = {
  decorators: [withPathname('/')],
};

export const Wireframe: Story = {
  decorators: [withPathname('/')],
  globals: { theme: 'wireframe' },
};

/** A nested route: `Repositories` is active on prefix, which is why `/repositories/1` lights it. */
export const RepositoriesActive: Story = {
  decorators: [withPathname('/repositories/1')],
};

/** Below `md` the sidebar becomes the top bar and the nav collapses behind the palette. */
export const Mobile: Story = {
  decorators: [withPathname('/')],
  globals: { viewport: { value: 'base390' } },
};

/** Tablet tier — the middle of the three-step ladder ADR 0009 Decision 6 defines. */
export const Tablet: Story = {
  decorators: [withPathname('/')],
  globals: { viewport: { value: 'md900' } },
};
