// Page-level acceptance story for `/admin/roles` — the platform-role grant directory
// (converse-frontends#452, story C9; backed by lightbridge-authz#656's `platform_role_grants`).
//
// This is the screen that ends the console's role-derived authorization. Before it, `/admin/*`
// hung on `roles.includes('lightbridge-admin')` — a role production minted for EVERY signed-in
// person (prod mapped `owner -> ["lightbridge-admin"]`, and under ADR-0026 everyone owns an
// account), so admin was the default rather than a decision. Here, admin is a row somebody wrote:
// with a granter, a timestamp, and a stated reason.
//
// The composition `apps/console`'s `(console)` layout + `admin-roles-centre.tsx` performs for real:
// `PageHeader` (title, the propagation sentence, and the "Grant role" primary), an optional
// outcome `InlineStatus`, and one `Card` holding the section's toolbar + table + pager.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { InlineStatus } from '../components/inline-status';
import { PageHeader } from '../sections/page-header';
import { PlatformRoleGrants } from '../sections/platform-role-grants';
import {
  grantUserSearchFixture,
  platformRoleGrantsFixture,
  platformRoleGrantsWithRevokedFixture,
} from '../sections/platform-role-grants/fixtures';
import { GrantRoleDialog } from '../sections/platform-role-grants/grant-role-dialog';
import { RevokeRoleDialog } from '../sections/platform-role-grants/revoke-role-dialog';
import type { GrantUserOption, PlatformRoleGrantRow } from '../sections/platform-role-grants';
import { storySidebar, storyTopBar } from './shell-fixtures';

/** `apps/console/src/shared/permissions.ts`'s `PLATFORM_ROLES`, restated: a `ui-web` section takes
 *  its catalogue as a prop, since no procedure returns the deployment's own configured list. */
const ROLES = ['lightbridge-admin', 'lightbridge-editor', 'lightbridge-viewer'] as const;

/** The header sentence `admin-roles-centre.tsx` renders verbatim — the propagation rule, stated
 *  permanently rather than only after a mutation. */
const SUBTITLE =
  'A platform role follows the person across every account they own. Grants take effect at the ' +
  'holder’s next token mint; revocations close their sessions and apply immediately.';

interface AdminRolesScreenProps {
  grants?: PlatformRoleGrantRow[];
  loading?: boolean;
  error?: string;
  initialIncludeRevoked?: boolean;
  identityStatus?: string;
  outcome?: string;
  /** Which dialog, if any, is open on top of the screen. */
  dialog?: 'none' | 'grant' | 'revoke' | 'revoke-self';
  grantResults?: GrantUserOption[];
  grantSelected?: GrantUserOption | null;
  grantQuery?: string;
}

function AdminRolesScreen({
  grants = platformRoleGrantsFixture,
  loading = false,
  error,
  initialIncludeRevoked = false,
  identityStatus,
  outcome,
  dialog = 'none',
  grantResults = [],
  grantSelected = null,
  grantQuery = '',
}: AdminRolesScreenProps) {
  const [roleFilter, setRoleFilter] = useState('');
  const [includeRevoked, setIncludeRevoked] = useState(initialIncludeRevoked);
  const [query, setQuery] = useState(grantQuery);
  const [selectedUser, setSelectedUser] = useState<GrantUserOption | null>(grantSelected);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [reason, setReason] = useState('');

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Platform roles"
          subtitle={SUBTITLE}
          action={
            <Button type="button" variant="primary">
              Grant role
            </Button>
          }
        />

        {outcome ? <InlineStatus>{outcome}</InlineStatus> : null}

        <Card>
          <PlatformRoleGrants
            grants={grants}
            loading={loading}
            loadingRowCount={6}
            error={error}
            onRetry={() => {}}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            roles={ROLES}
            includeRevoked={includeRevoked}
            onIncludeRevokedChange={setIncludeRevoked}
            onRequestRevoke={() => {}}
            identityStatus={identityStatus}
            pagination={{
              shown: grants.length,
              hasPrev: false,
              hasNext: true,
              onNext: () => {},
            }}
          />
        </Card>
      </div>

      {dialog === 'grant' ? (
        <GrantRoleDialog
          open
          query={query}
          onQueryChange={setQuery}
          minQueryLength={2}
          results={grantResults}
          searching={false}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          role={role}
          onRoleChange={setRole}
          roles={ROLES}
          reason={reason}
          onReasonChange={setReason}
          submitting={false}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      ) : null}

      {dialog === 'revoke' || dialog === 'revoke-self' ? (
        <RevokeRoleDialog
          // Index 1 is someone else's grant; index 0 is the signed-in operator's own
          // (`isSelf: true`), which is what triggers the extra self-revocation warning.
          grant={
            dialog === 'revoke-self' ? platformRoleGrantsFixture[0] : platformRoleGrantsFixture[1]
          }
          submitting={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      ) : null}
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminRolesScreen> = {
  title: 'Pages/AdminRoles',
  component: AdminRolesScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminRolesScreen>;

export const Populated: Story = { render: () => <AdminRolesScreen /> };

export const PopulatedLight: Story = {
  render: () => <AdminRolesScreen />,
  globals: { theme: 'wireframe' },
};

/** The audit view: `Include revoked` on, so the Revoked column appears and a revoked row carries
 *  no action (`revokePlatformRole` refuses re-revocation — the original timestamp is the fact). */
export const AuditView: Story = {
  render: () => (
    <AdminRolesScreen grants={platformRoleGrantsWithRevokedFixture} initialIncludeRevoked />
  ),
};

/** Before the `rbac grant` CLI bootstrap has run — the state every deployment starts in. */
export const Empty: Story = { render: () => <AdminRolesScreen grants={[]} /> };

export const EmptyLight: Story = {
  render: () => <AdminRolesScreen grants={[]} />,
  globals: { theme: 'wireframe' },
};

export const Loading: Story = { render: () => <AdminRolesScreen grants={[]} loading /> };

export const Failed: Story = {
  render: () => <AdminRolesScreen grants={[]} error="Could not load platform role grants." />,
};

/** The grants loaded; only the separate `resolveUserProfiles` batch failed. */
export const IdentitiesDegraded: Story = {
  render: () => (
    <AdminRolesScreen identityStatus="User names could not be resolved — showing the raw user id instead." />
  ),
};

export const GrantDialog: Story = {
  render: () => (
    <AdminRolesScreen dialog="grant" grantQuery="ada" grantResults={grantUserSearchFixture} />
  ),
};

export const GrantDialogLight: Story = {
  render: () => (
    <AdminRolesScreen dialog="grant" grantQuery="ada" grantResults={grantUserSearchFixture} />
  ),
  globals: { theme: 'wireframe' },
};

export const RevokeConfirm: Story = { render: () => <AdminRolesScreen dialog="revoke" /> };

export const RevokeConfirmLight: Story = {
  render: () => <AdminRolesScreen dialog="revoke" />,
  globals: { theme: 'wireframe' },
};

/** Revoking your OWN grant — legitimate, and warned about, because it costs this screen. */
export const RevokeOwnGrant: Story = { render: () => <AdminRolesScreen dialog="revoke-self" /> };

/** After a revocation: `revokedSessionCount` said out loud, as an `InlineStatus` — the console has
 *  no toast pattern (ADR 0008), and this figure is worth leaving on screen. */
export const RevokeOutcome: Story = {
  render: () => (
    <AdminRolesScreen outcome="Revoked lightbridge-editor · 3 sessions closed, so the change applies now." />
  ),
};

/**
 * The permission-denied state, for the record: there isn't one to render.
 *
 * `/admin/roles` answers `notFound()` for a caller without `rbac:manage` — never a 403 page, never
 * a disabled screen — so a person who lacks the permission sees Next's own 404, and the chrome has
 * already omitted both nav rows that point here. This story is the CALLER-side proof: the admin
 * sidebar with no rows at all, which is exactly what a plain `lightbridge-viewer` gets.
 */
export const NoAdminAccess: Story = {
  render: () => (
    <ConsoleShell sidebar={storySidebar('settings', { showAdmin: false })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Settings"
          subtitle="An account owner with no platform grant sees no Admin row, and every /admin/* URL returns a 404."
        />
      </div>
    </ConsoleShell>
  ),
};
