// `/runs` — every task run, filterable by status and searchable, one page at a time.
//
// The status filter and the search box are URL state, so the `nuqs` adapter is mounted for real:
// clicking a segment rewrites `?status=`. The server owns the actual filtering, so `Failed` hands
// the screen the page the app would have fetched for that filter rather than pretending the
// client narrows the rows.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RunsCentre } from './runs-centre';
import { NOW, TASKS, withNuqs, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Runs',
  component: RunsCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: { now: NOW },
} satisfies Meta<typeof RunsCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every status the table branches on: succeeded, running, failed, queued, cancelled, timed out. */
export const Default: Story = {
  args: { result: { ok: true, data: { tasks: TASKS, total: TASKS.length } } },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** A run that has started but not finished shows a live duration and no completion time. */
export const Running: Story = {
  args: {
    result: {
      ok: true,
      data: { tasks: TASKS.filter((t) => t.status === 'running'), total: 1 },
    },
  },
};

/** Only the `attention` tone, so a regression in `statusTone` is visible in isolation. */
export const Failed: Story = {
  args: {
    result: {
      ok: true,
      data: {
        tasks: TASKS.filter((t) => t.status === 'failed' || t.status === 'timed_out'),
        total: 2,
      },
    },
  },
};

/** More runs than one page holds — both pagination controls live, plus the range line. */
export const Paged: Story = {
  args: { result: { ok: true, data: { tasks: TASKS, total: 214 } } },
};

/** A filter that matched nothing. The chrome (filter + search) stays; only the table goes. */
export const Empty: Story = {
  args: { result: { ok: true, data: { tasks: [], total: 0 } } },
};

export const Unavailable: Story = {
  args: { result: { ok: false, reason: 'unavailable' } },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
