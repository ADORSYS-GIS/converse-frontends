// `/repositories/[id]/settings` — the Settings tab: six review-behaviour settings, each showing
// whether it is on its default, set by the repo's own config file, or overridden by an admin.
//
// Provenance is the point of this screen, so the fixture deliberately spreads the three sources
// across the six rows: an admin override reads `attention`, `file` and `default` both read
// `muted` (both mean "nothing overridden here").
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RepositorySettingsCentre } from './repository-settings-centre';
import { RESOLVED_SETTINGS, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/RepositorySettings',
  component: RepositorySettingsCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { id: 1 },
} satisfies Meta<typeof RepositorySettingsCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    canConfigure: true,
    result: { ok: true, data: { settings: RESOLVED_SETTINGS } },
  },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** No `repo:configure`: an inline read-only line above the card, and every control disabled. */
export const ReadOnly: Story = {
  args: {
    canConfigure: false,
    result: { ok: true, data: { settings: RESOLVED_SETTINGS } },
  },
};

/** Nothing overridden anywhere — every row on its built-in default. */
export const AllDefaults: Story = {
  args: {
    canConfigure: true,
    result: {
      ok: true,
      data: {
        settings: {
          check_run_reporting: { value: true, source: 'default' },
          review_on_pr_open: { value: true, source: 'default' },
          review_on_push: { value: true, source: 'default' },
          push_strategy: { value: 'supersede', source: 'default' },
          push_debounce: { value: { secs: 30, nanos: 0 }, source: 'default' },
          dedup_scope: { value: 'pr', source: 'default' },
        },
      },
    },
  },
};

export const Unavailable: Story = {
  args: { canConfigure: true, result: { ok: false, reason: 'unavailable' } },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
