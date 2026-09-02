import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/refill-policies` — moved off `/settings/refill-options` (owner ruling, verbatim:
 * "Refill options are for admins only. Not normal users.", converse-frontends#368), the SAME
 * server-side role gate `admin/overview/page.tsx` and `admin/refills-queue/page.tsx` already use.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any markup.
 * `notFound()` and not a 403, so a non-admin does not learn the route exists at all. This is still
 * only the UI half — `lightbridge-authz` enforces the real permission on every procedure the
 * screen calls regardless.
 */
const REFILL_POLICIES_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'admin',
  'refill-policies',
  'page.tsx'
);

describe('the /admin/refill-policies role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), REFILL_POLICIES_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.budgetPolicyWrite)');
    expect(source).toContain('notFound()');
  });

  it('gates the one nav surface that links to it, cosmetic but must not regress into "shown then 404s"', () => {
    // `adminNavGroups` filters each row against the caller's own permission set
    // (converse-frontends#452) — there is no settings-area row to gate any more, since the whole
    // destination moved off that area (`settingsNavGroups` no longer lists it at all,
    // `console-chrome.test.ts`'s own regression guard for that).
    const chrome = readFileSync(join(process.cwd(), 'src', 'client', 'console-chrome.tsx'), 'utf8');

    expect(chrome).toContain("'refill-policies'");
    expect(chrome).toContain('export function adminNavGroups');
    expect(chrome).toContain('permission: PERMISSION.budgetPolicyWrite');
  });

  it('308s the old /settings/refill-options path to the new one, verbatim query params included', () => {
    const middleware = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8');

    expect(middleware).toContain("'/settings/refill-options'");
    expect(middleware).toContain('/admin/refill-policies');
  });

  it('leaves no leftover /settings/refill-options route now that it is admin-only', () => {
    expect(
      existsSync(join(process.cwd(), 'src', 'app', '(console)', 'settings', 'refill-options'))
    ).toBe(false);
  });

  it('never renders edit and simulate on the same view — the owner-dictated split', () => {
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-refill-policies-centre.tsx'),
      'utf8'
    );

    // Three distinct view functions, one per mode family. The dispatcher itself — everything
    // between its own declaration and the next top-level `function` — picks exactly one: two
    // early `return <...>` statements and no JSX fragment/array that could combine two of them
    // into one tree. `create` is no longer one of this dispatcher's modes at all (owner review
    // round 2, 2026-08-31, converse-frontends#368 finding #4) — it moved to its own route,
    // `admin-refill-policy-create-route-gate.test.ts` covers that one.
    expect(centre).toContain('function RefillPolicyListView');
    expect(centre).toContain('function RefillPolicyFormView');
    expect(centre).toContain('function RefillPolicySimulateView');

    const dispatcherStart = centre.indexOf('export function AdminRefillPoliciesCentre');
    const dispatcherEnd = centre.indexOf('function RefillPolicyListView');
    const dispatcher = centre.slice(dispatcherStart, dispatcherEnd);

    expect(dispatcher).toContain("if (screen.mode === 'edit')");
    expect(dispatcher).toContain("if (screen.mode === 'simulate')");
    expect(dispatcher).not.toContain("screen.mode === 'create'");
    expect((dispatcher.match(/return </g) ?? []).length).toBe(3);
    expect(dispatcher).not.toMatch(/<>/);
    expect(dispatcher).not.toMatch(/return \[/);
  });
});
