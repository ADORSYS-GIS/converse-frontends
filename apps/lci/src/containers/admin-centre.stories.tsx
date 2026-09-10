// `/admin`, `/admin/accepted`, `/admin/denied` — repository approvals, one status per route. A
// newly connected repository stays pending until an approver acts; only then is it indexed or
// reviewed.
//
// The permission booleans are the interesting axis: `canApprove`/`canDeny` come from the token,
// and a reader with neither still sees the queue (it is not a 404) with no buttons on it. The
// approve/deny Server Actions are aliased to no-ops in Storybook — what they do to the control
// plane is `admin-centre.test.tsx`'s job, not a screenshot's.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AdminCentre } from './admin-centre';
import { REPOSITORIES, withNuqs, withPagePadding, withPathname } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Admin',
  component: AdminCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding, withPathname('/admin')],
  args: {
    title: 'Pending',
    emptyMessage: 'No pending repositories.',
    canApprove: true,
    canDeny: true,
  },
} satisfies Meta<typeof AdminCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Pending tab — one repository awaiting a decision. */
export const Default: Story = {
  args: { result: { ok: true, data: REPOSITORIES.filter((repo) => repo.status === 'pending') } },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** The Accepted tab. */
export const Accepted: Story = {
  decorators: [withPathname('/admin/accepted')],
  args: {
    title: 'Accepted',
    emptyMessage: 'No accepted repositories.',
    result: { ok: true, data: REPOSITORIES.filter((repo) => repo.status === 'approved') },
  },
};

/** The Denied tab. */
export const Denied: Story = {
  decorators: [withPathname('/admin/denied')],
  args: {
    title: 'Denied',
    emptyMessage: 'No denied repositories.',
    result: { ok: true, data: REPOSITORIES.filter((repo) => repo.status === 'disabled') },
  },
};

/** Nothing pending — the empty message stands in for the list. */
export const NothingPending: Story = {
  args: { result: { ok: true, data: [] } },
};

/** `repo:read` but neither `repo:approve` nor `repo:deny` — the queue is readable, not actionable. */
export const ReadOnly: Story = {
  args: {
    result: { ok: true, data: REPOSITORIES.filter((repo) => repo.status === 'pending') },
    canApprove: false,
    canDeny: false,
  },
};

/** No admin permission at all: `result` is `null` and the screen says which grant is missing. */
export const NoPermission: Story = {
  args: { result: null, canApprove: false, canDeny: false },
};

export const Unavailable: Story = {
  args: { result: { ok: false, reason: 'unavailable' } },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
