import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { settingsNavGroups } from '../client/console-chrome';
import { PERMISSION } from '../shared/permissions';

/**
 * `/settings/tiers` — "Tier configs", gated on `project:update` (owner ruling, 2026-09-03,
 * verbatim: "users with the role -viewer should not even see tiers").
 *
 * The first GATED destination in the settings area that is not an exit into `/admin`, so it is
 * worth stating what the gate is and is not. It is not a role check: `lightbridge-viewer` is not
 * named anywhere in the console (`no-role-derived-gates.test.ts` forbids exactly that), and the
 * roles below are here only as the permission SETS `default_role_permissions()` resolves them to
 * — the same arrays `getMyAccess` hands the session.
 *
 * It is a WRITE permission on a READ-ONLY screen, deliberately. `/settings/tiers` renders the
 * billing-plan catalogue and the tiers currently assigned to the scoped account and its projects,
 * with no picker anywhere; the RPC that CHANGES an assigned tier is `procedure.setProjectQuota`,
 * which `lightbridge-authz-rest`'s `rpc_authorize.rs` maps to `project:update`. Gating on the read
 * a viewer holds (`project:read`) would have kept the page visible to exactly the people the ruling
 * says must not see it, so the gate is the write.
 *
 * Source-shape assertion for the segment (the same reasoning every `admin-*-route-gate.test.ts`
 * states — the property is about the route SEGMENT refusing before it generates markup) plus a
 * real call into `settingsNavGroups`, so "the row and the page agree" is checked rather than
 * asserted.
 */
const TIERS_SEGMENT = join('src', 'app', '(console)', 'settings', 'tiers', 'page.tsx');

/** `default_role_permissions()`, `lightbridge-authz-core/src/authz.rs`, expanded exactly as the
 *  backend expands `project:*`/`apikey:*` before `getMyAccess` answers with them. */
const VIEWER_PERMISSIONS = [
  'account:create',
  'account:read',
  'project:read',
  'apikey:read',
  'session:revoke-own',
  'budget:read-own',
];

const EDITOR_PERMISSIONS = [
  'account:create',
  'account:read',
  'project:create',
  'project:read',
  'project:update',
  'project:delete',
  'project:disable',
  'project:member',
  'apikey:create',
  'apikey:read',
  'apikey:update',
  'apikey:delete',
  'apikey:revoke',
  'apikey:rotate',
  'apikey:validate',
  'session:revoke-own',
  'budget:read-own',
];

describe('the /settings/tiers permission gate', () => {
  it('decrypts the session and 404s a caller without project:update', () => {
    const source = readFileSync(join(process.cwd(), TIERS_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.projectUpdate)');
    expect(source).toContain('notFound()');
  });

  it('names the permission the tier-changing RPC actually requires', () => {
    // Pinned against `rpc_authorize.rs`'s `"procedure.setProjectQuota" => ProjectUpdate`. A rename
    // upstream must surface here rather than as a screen that silently disappeared for everyone.
    expect(PERMISSION.projectUpdate).toBe('project:update');
  });

  it('hides the row from a viewer, exactly as the route hides the page', () => {
    const [group] = settingsNavGroups('overview', VIEWER_PERMISSIONS);
    expect(group.items.find((item) => item.key === 'tiers')).toBeUndefined();
    // Omitted, never disabled — the included-or-omitted contract every gated row in the chrome
    // follows, because a visible row here would advertise a URL the segment above answers 404 for.
    expect(group.items.some((item) => item.disabled)).toBe(false);
  });

  it('keeps the row for an editor, who can actually change a tier', () => {
    const [group] = settingsNavGroups('overview', EDITOR_PERMISSIONS);
    const tiers = group.items.find((item) => item.key === 'tiers');

    expect(tiers?.href).toBe('/settings/tiers');
    expect(tiers?.disabled).toBeUndefined();
  });
});
