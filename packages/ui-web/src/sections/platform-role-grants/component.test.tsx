import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlatformRoleGrants } from './component';
import { platformRoleGrantsFixture, platformRoleGrantsWithRevokedFixture } from './fixtures';
import { REVOKE_SELF_WARNING, REVOKE_SESSION_NOTE, RevokeRoleDialog } from './revoke-role-dialog';
import { GRANT_AUTHOR_CLI_LABEL } from './types';
import type { PlatformRoleGrantsProps } from './types';

const ROLES = ['lightbridge-admin', 'lightbridge-editor', 'lightbridge-viewer'] as const;

function makeProps(overrides: Partial<PlatformRoleGrantsProps> = {}): PlatformRoleGrantsProps {
  return {
    grants: platformRoleGrantsFixture,
    roleFilter: '',
    onRoleFilterChange: vi.fn(),
    roles: ROLES,
    includeRevoked: false,
    onIncludeRevokedChange: vi.fn(),
    onRequestRevoke: vi.fn(),
    ...overrides,
  };
}

describe('PlatformRoleGrants', () => {
  it('renders the grant columns the acceptance criteria name', () => {
    render(<PlatformRoleGrants {...makeProps()} />);

    // Exact names, not substrings: `Granted by` and `Granted` are two distinct columns and a
    // regex for the shorter one matches both.
    for (const header of ['User', 'Role', 'Granted by', 'Granted', 'Reason']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  // A NULL `granted_by` is the CLI bootstrap — the only way the first admin can exist. The schema
  // says verbatim: "render it as 'CLI bootstrap', never as 'unknown'".
  it('labels a CLI-bootstrap grant as such, never as an unknown granter', () => {
    render(<PlatformRoleGrants {...makeProps()} />);

    expect(screen.getAllByText(GRANT_AUTHOR_CLI_LABEL).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument();
  });

  it('shows a resolved holder as name over email, and an unresolved one as a labelled sentinel', () => {
    render(<PlatformRoleGrants {...makeProps()} />);

    expect(screen.getByText('Ada Nkemdirim')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Unresolved user')).toBeInTheDocument();
    expect(screen.getByText('usr_01k4h2m9x7q3n5t8v0w2y4z6b8')).toBeInTheDocument();
  });

  it('labels a grant with no recorded reason instead of leaving the cell blank', () => {
    render(<PlatformRoleGrants {...makeProps()} />);

    expect(screen.getByText('No reason given')).toBeInTheDocument();
  });

  // The Revoked column is data-driven: a column reading "Active" on every row of the default view
  // says nothing, so it only exists in the view where revoked rows can appear.
  it('adds the Revoked column only when revoked grants are included', () => {
    const { rerender } = render(<PlatformRoleGrants {...makeProps()} />);
    expect(screen.queryByRole('columnheader', { name: /Revoked/ })).not.toBeInTheDocument();

    rerender(
      <PlatformRoleGrants
        {...makeProps({ includeRevoked: true, grants: platformRoleGrantsWithRevokedFixture })}
      />
    );
    expect(screen.getByRole('columnheader', { name: /Revoked/ })).toBeInTheDocument();
  });

  // `revokePlatformRole` refuses an already-revoked grant — overwriting `revoked_at` would destroy
  // the audit fact the row exists for. The UI must not offer what the backend will refuse.
  it('offers no revoke action on an already-revoked grant', () => {
    render(
      <PlatformRoleGrants
        {...makeProps({ includeRevoked: true, grants: platformRoleGrantsWithRevokedFixture })}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(
      platformRoleGrantsFixture.length
    );
  });

  it('asks the caller to revoke the row that was pressed', () => {
    const onRequestRevoke = vi.fn();
    render(<PlatformRoleGrants {...makeProps({ onRequestRevoke })} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Revoke' })[1]);

    expect(onRequestRevoke).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'grant_ada', role: 'lightbridge-editor' })
    );
  });

  it('distinguishes an empty directory from an empty filter', () => {
    const { rerender } = render(<PlatformRoleGrants {...makeProps({ grants: [] })} />);
    expect(screen.getByText('No platform roles are granted')).toBeInTheDocument();

    rerender(
      <PlatformRoleGrants {...makeProps({ grants: [], roleFilter: 'lightbridge-admin' })} />
    );
    expect(screen.getByText('No grants match this filter')).toBeInTheDocument();
  });

  // The grants and the names come from two different calls; the second failing must never blank a
  // page of real grants (the same split the refills queue makes).
  it('renders the table beside a degraded identity-resolution status, not instead of it', () => {
    render(
      <PlatformRoleGrants {...makeProps({ identityStatus: 'User names could not be resolved.' })} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('User names could not be resolved.');
    expect(screen.getByText('Ada Nkemdirim')).toBeInTheDocument();
  });
});

describe('RevokeRoleDialog', () => {
  it('renders nothing at all without a grant to describe', () => {
    const { container } = render(
      <RevokeRoleDialog grant={null} submitting={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // The typed object is the ROLE, not the grant id: a cuid2 is not something a human can
  // proof-read, and the mistake this gate catches is "wrong role".
  it('gates confirmation on typing the role name, and says sessions are closed', async () => {
    const onConfirm = vi.fn();
    render(
      <RevokeRoleDialog
        grant={platformRoleGrantsFixture[1]}
        submitting={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(REVOKE_SESSION_NOTE);

    const confirm = screen.getByRole('button', { name: 'Revoke role' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type "lightbridge-editor" to confirm'), {
      target: { value: 'lightbridge-editor' },
    });
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('warns explicitly when the grant being revoked is the caller’s own', async () => {
    render(
      <RevokeRoleDialog
        grant={platformRoleGrantsFixture[0]}
        submitting={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(REVOKE_SELF_WARNING);
  });

  it('does not warn about self-revocation for someone else’s grant', async () => {
    render(
      <RevokeRoleDialog
        grant={platformRoleGrantsFixture[1]}
        submitting={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(await screen.findByRole('alertdialog')).not.toHaveTextContent(REVOKE_SELF_WARNING);
  });
});
