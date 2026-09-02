import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { PlatformRoleGrants } from './component';
import {
  grantUserSearchFixture,
  platformRoleGrantsFixture,
  platformRoleGrantsWithRevokedFixture,
} from './fixtures';
import { GrantRoleDialog } from './grant-role-dialog';
import { RevokeRoleDialog } from './revoke-role-dialog';
import type { GrantUserOption, PlatformRoleGrantRow } from './types';

/**
 * `/admin/roles` — the platform-role grant directory (converse-frontends#452, story C9).
 *
 * The console's `PLATFORM_ROLES` is stated in `apps/console/src/shared/permissions.ts`; these
 * stories restate the same three because a `ui-web` section takes its catalogue as a prop (there
 * is no procedure that returns it — it is deployment config `grantPlatformRole` validates
 * against).
 */
const ROLES = ['lightbridge-admin', 'lightbridge-editor', 'lightbridge-viewer'] as const;

const meta: Meta<typeof PlatformRoleGrants> = {
  title: 'Sections/PlatformRoleGrants',
  component: PlatformRoleGrants,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof PlatformRoleGrants>;

function Demo({
  grants = platformRoleGrantsFixture,
  loading = false,
  error,
  initialIncludeRevoked = false,
  identityStatus,
  withPagination = false,
}: {
  grants?: PlatformRoleGrantRow[];
  loading?: boolean;
  error?: string;
  initialIncludeRevoked?: boolean;
  identityStatus?: string;
  withPagination?: boolean;
}) {
  const [roleFilter, setRoleFilter] = useState('');
  const [includeRevoked, setIncludeRevoked] = useState(initialIncludeRevoked);

  return (
    <div className="p-6">
      <Card>
        <PlatformRoleGrants
          grants={grants}
          loading={loading}
          error={error}
          onRetry={() => {}}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          roles={ROLES}
          includeRevoked={includeRevoked}
          onIncludeRevokedChange={setIncludeRevoked}
          onRequestRevoke={() => {}}
          identityStatus={identityStatus}
          pagination={
            withPagination
              ? { shown: grants.length, hasPrev: false, hasNext: true, onNext: () => {} }
              : undefined
          }
        />
      </Card>
    </div>
  );
}

export const Populated: Story = { render: () => <Demo /> };

export const PopulatedLight: Story = {
  render: () => <Demo />,
  globals: { theme: 'wireframe' },
};

/** `Include revoked` on — the audit view, with the extra Revoked column and no row action on a
 *  grant that is already revoked. */
export const IncludingRevoked: Story = {
  render: () => <Demo grants={platformRoleGrantsWithRevokedFixture} initialIncludeRevoked />,
};

export const IncludingRevokedLight: Story = {
  render: () => <Demo grants={platformRoleGrantsWithRevokedFixture} initialIncludeRevoked />,
  globals: { theme: 'wireframe' },
};

/** A genuinely empty directory — nobody has been granted a platform role yet, which is the state
 *  every deployment starts in before the `rbac grant` bootstrap runs. */
export const Empty: Story = { render: () => <Demo grants={[]} /> };

export const EmptyLight: Story = {
  render: () => <Demo grants={[]} />,
  globals: { theme: 'wireframe' },
};

export const Loading: Story = { render: () => <Demo grants={[]} loading /> };

export const Failed: Story = {
  render: () => <Demo grants={[]} error="Could not load platform role grants." />,
};

/** The grants themselves loaded; only the separate `resolveUserProfiles` batch failed. */
export const IdentitiesDegraded: Story = {
  render: () => (
    <Demo identityStatus="User names could not be resolved — showing the raw user id instead." />
  ),
};

// ── The grant dialog ──────────────────────────────────────────────────────────────────────────

function GrantDemo({
  initialQuery = '',
  results = [],
  searching = false,
  searchError,
  initialUser = null,
  submitting = false,
  error,
}: {
  initialQuery?: string;
  results?: GrantUserOption[];
  searching?: boolean;
  searchError?: string;
  initialUser?: GrantUserOption | null;
  submitting?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [user, setUser] = useState<GrantUserOption | null>(initialUser);
  const [role, setRole] = useState<string>(ROLES[2]);
  const [reason, setReason] = useState('');

  return (
    <GrantRoleDialog
      open
      query={query}
      onQueryChange={setQuery}
      minQueryLength={2}
      results={results}
      searching={searching}
      searchError={searchError}
      selectedUser={user}
      onSelectUser={setUser}
      role={role}
      onRoleChange={setRole}
      roles={ROLES}
      reason={reason}
      onReasonChange={setReason}
      submitting={submitting}
      error={error}
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  );
}

/** Nothing typed yet — the picker states the minimum the backend will accept. */
export const GrantDialogEmptySearch: Story = { render: () => <GrantDemo /> };

export const GrantDialogEmptySearchLight: Story = {
  render: () => <GrantDemo />,
  globals: { theme: 'wireframe' },
};

/** A query the directory answered. The third result carries no email — a real row shape, since
 *  every `federated_identities` profile field is independently nullable. */
export const GrantDialogResults: Story = {
  render: () => <GrantDemo initialQuery="ada" results={grantUserSearchFixture} />,
};

export const GrantDialogSearching: Story = {
  render: () => <GrantDemo initialQuery="ada" searching />,
};

/** "No matches" and "the search failed" are different claims — this is the second one. */
export const GrantDialogSearchFailed: Story = {
  render: () => <GrantDemo initialQuery="ada" searchError="User search is unavailable." />,
};

export const GrantDialogSelected: Story = {
  render: () => (
    <GrantDemo
      initialQuery="Ada Nkemdirim"
      results={grantUserSearchFixture}
      initialUser={grantUserSearchFixture[0]}
    />
  ),
};

export const GrantDialogSelectedLight: Story = {
  render: () => (
    <GrantDemo
      initialQuery="Ada Nkemdirim"
      results={grantUserSearchFixture}
      initialUser={grantUserSearchFixture[0]}
    />
  ),
  globals: { theme: 'wireframe' },
};

export const GrantDialogFailed: Story = {
  render: () => (
    <GrantDemo
      initialQuery="Ada Nkemdirim"
      results={grantUserSearchFixture}
      initialUser={grantUserSearchFixture[0]}
      error="lightbridge-authz refused the grant: unknown role."
    />
  ),
};

// ── The revoke confirmation ───────────────────────────────────────────────────────────────────

/** Someone else's grant: the typed gate plus the session-closure consequence. */
export const RevokeConfirm: Story = {
  render: () => (
    <RevokeRoleDialog
      grant={platformRoleGrantsFixture[1]}
      submitting={false}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
};

export const RevokeConfirmLight: Story = {
  render: () => (
    <RevokeRoleDialog
      grant={platformRoleGrantsFixture[1]}
      submitting={false}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
  globals: { theme: 'wireframe' },
};

/** The operator's OWN grant — the extra warning that confirming costs them this screen. */
export const RevokeConfirmSelf: Story = {
  render: () => (
    <RevokeRoleDialog
      grant={platformRoleGrantsFixture[0]}
      submitting={false}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
};

export const RevokeConfirmSelfLight: Story = {
  render: () => (
    <RevokeRoleDialog
      grant={platformRoleGrantsFixture[0]}
      submitting={false}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
  globals: { theme: 'wireframe' },
};

export const RevokeFailed: Story = {
  render: () => (
    <RevokeRoleDialog
      grant={platformRoleGrantsFixture[1]}
      submitting={false}
      error="lightbridge-authz refused the revocation: this grant is already revoked."
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
};
