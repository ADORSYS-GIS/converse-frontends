// `/` — LCI's Overview: KPIs, a 14-day trend, breakdowns by repository and outcome, recent runs.
//
// The screen derives everything it draws from ONE list of `Task`s (`lib/domain/insights.ts`), so
// these variants differ only in what that list holds — which is the honest way to review it: a
// changed KPI here is a changed derivation, not a changed fixture.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { OverviewCentre } from './overview-centre';
import { NOW, TASKS, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Overview',
  component: OverviewCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { now: NOW },
} satisfies Meta<typeof OverviewCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { result: { ok: true, data: TASKS } },
};

/** Light theme — a hardcoded colour shows up in exactly one of the two. */
export const Wireframe: Story = {
  args: { result: { ok: true, data: TASKS } },
  globals: { theme: 'wireframe' },
};

/** First run: connected, indexed, nothing has triggered yet. Inline status lines, never placards. */
export const Empty: Story = {
  args: { result: { ok: true, data: [] } },
};

/** The control plane is down. An error line replaces the insights — never a fabricated zero. */
export const Unavailable: Story = {
  args: { result: { ok: false, reason: 'unavailable' } },
};

/** The session cannot reach the control plane; the copy says to sign in again, not "error". */
export const Unauthenticated: Story = {
  args: { result: { ok: false, reason: 'unauthenticated' } },
};

/** Narrow viewport — the stat row and the two breakdown cards stack. */
export const Mobile: Story = {
  args: { result: { ok: true, data: TASKS } },
  globals: { viewport: { value: 'base390' } },
};
