// `/settings` — app-level settings. Read-only by design: identity is Keycloak's, permissions come
// from the token, and indexing is automatic, so every row here is a fact plus a link out.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CLAIMS, PERMISSIONS, withPagePadding } from './story-fixtures';
import { SettingsCentre } from './settings-centre';

const meta = {
  title: 'Pages/LCI/Settings',
  component: SettingsCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
} satisfies Meta<typeof SettingsCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { claims: CLAIMS, perms: PERMISSIONS },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** A token with no permissions claim — the Access row says so instead of rendering an empty list. */
export const NoPermissions: Story = {
  args: { claims: CLAIMS, perms: [] },
};

/**
 * The identity fallback chain (`name` → `preferred_username` → `email` → `sub`) at its far end:
 * a token carrying only a subject still renders every row, muted where the claim is absent.
 */
export const MinimalClaims: Story = {
  args: {
    claims: { sub: 'usr_01j8k2m4pqr7', exp: Math.floor(Date.now() / 1000) + 3600 },
    perms: ['repo:read'],
  },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
