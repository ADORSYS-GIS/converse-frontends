// `/admin` — repository approvals. A newly connected repository stays pending until an approver
// acts; only then is it indexed or reviewed.
//
// The permission booleans are the interesting axis: `canApprove`/`canDeny` come from the token,
// and a reader with neither still sees the queue (it is not a 404) with no buttons on it. The
// approve/deny Server Actions are aliased to no-ops in Storybook — what they do to the control
// plane is `admin-centre.test.tsx`'s job, not a screenshot's.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AdminCentre } from './admin-centre';
import { REPOSITORIES, repository, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Admin',
  component: AdminCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { canApprove: true, canDeny: true },
} satisfies Meta<typeof AdminCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All three sections populated: pending, approved, denied. */
export const Default: Story = {
  args: { result: { ok: true, data: REPOSITORIES } },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** Nothing waiting. The Pending card stays with an inline line; the other two sections vanish. */
export const NothingPending: Story = {
  args: {
    result: { ok: true, data: [repository(), repository({ id: 2, name: 'converse-frontends' })] },
  },
};

/** `repo:read` but neither `repo:approve` nor `repo:deny` — the queue is readable, not actionable. */
export const ReadOnly: Story = {
  args: { result: { ok: true, data: REPOSITORIES }, canApprove: false, canDeny: false },
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
