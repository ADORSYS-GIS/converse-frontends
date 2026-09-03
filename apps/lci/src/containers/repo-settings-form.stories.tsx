// The six review-behaviour settings, each on a `ui-web` `SettingsRow`: the control in `value`
// beside its provenance, the reset affordance in `action`.
//
// Storied separately from `Pages/LCI/RepositorySettings` because the interesting states are this
// component's own local ones — an override that can be reset vs. one that cannot, a disabled row,
// a failed write — not the page around it. The Server Actions it calls are aliased to no-ops in
// Storybook (`packages/ui-web/.storybook/lci-stubs/lci-server.ts`), so toggling a control shows
// the optimistic update and nothing else.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RepoSettingsForm } from './repo-settings-form';
import { RESOLVED_SETTINGS } from './story-fixtures';

const meta = {
  title: 'LCI/RepoSettingsForm',
  component: RepoSettingsForm,
  args: { id: 1, settings: RESOLVED_SETTINGS, canConfigure: true },
} satisfies Meta<typeof RepoSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three admin overrides (reset offered), one repo-file value, two defaults. */
export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** Without `repo:configure` every control is disabled, but the values still read. */
export const ReadOnly: Story = { args: { canConfigure: false } };

/** `push_strategy: debounce` is the one value that reveals the debounce-seconds field. */
export const DebounceStrategy: Story = {
  args: {
    settings: {
      ...RESOLVED_SETTINGS,
      push_strategy: { value: 'debounce', source: 'db' },
      push_debounce: { value: { secs: 300, nanos: 0 }, source: 'db' },
    },
  },
};

/** Every setting on its built-in default — nothing to reset, so no row offers it. */
export const AllDefaults: Story = {
  args: {
    settings: {
      check_run_reporting: { value: true, source: 'default' },
      review_on_pr_open: { value: true, source: 'default' },
      review_on_push: { value: true, source: 'default' },
      push_strategy: { value: 'supersede', source: 'default' },
      push_debounce: { value: { secs: 30, nanos: 0 }, source: 'default' },
      dedup_scope: { value: 'pr', source: 'default' },
    },
  },
};
