import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/refill-policies/create` — owner review round 2 (2026-08-31, converse-frontends#368
 * finding #4, verbatim): "You made out of /admin/refill-policies?create=true a full page.
 * Instead, I was thinking of a modal. But it's fine. Just move it to a page
 * /admin/refill-policies/create." Same server-side role gate every other `/admin/*` route uses
 * (`admin-refill-policies-route-gate.test.ts` covers the sibling list/edit/simulate route the
 * same way).
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any markup.
 */
const REFILL_POLICIES_CREATE_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'admin',
  'refill-policies',
  'create',
  'page.tsx'
);

describe('the /admin/refill-policies/create role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), REFILL_POLICIES_CREATE_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.budgetPolicyWrite)');
    expect(source).toContain('notFound()');
  });

  it('308s the old ?create=true query param to the new route, other params surviving verbatim', () => {
    const middleware = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8');

    expect(middleware).toContain("'/admin/refill-policies'");
    expect(middleware).toContain('/admin/refill-policies/create');
    expect(middleware).toContain("searchParams.get('create')");
  });

  it('the list route no longer offers a create mode of its own — "+ New policy" links here instead', () => {
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-refill-policies-centre.tsx'),
      'utf8'
    );

    expect(centre).toContain('/admin/refill-policies/create');
    expect(centre).not.toContain("screen.mode === 'create'");
  });

  it('reuses RefillPolicyFormView rather than a second, forked copy of the form', () => {
    const createCentre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-refill-policy-create-centre.tsx'),
      'utf8'
    );
    const listCentre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-refill-policies-centre.tsx'),
      'utf8'
    );

    expect(createCentre).toContain('RefillPolicyFormView');
    expect(createCentre).not.toContain('function RefillPolicyFormView');
    expect(listCentre).toContain('export function RefillPolicyFormView');
  });

  it("renders its own dedicated loading skeleton, not the list route's three-card one", () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          'src',
          'app',
          '(console)',
          'admin',
          'refill-policies',
          'create',
          'loading.tsx'
        )
      )
    ).toBe(true);
  });

  it('the create nuqs param is gone from the admin refill policies parsers entirely', () => {
    const urlState = readFileSync(join(process.cwd(), 'src', 'client', 'url-state.ts'), 'utf8');
    const parsersStart = urlState.indexOf('export const adminRefillPoliciesParsers');
    const parsersEnd = urlState.indexOf('};', parsersStart);
    const parsers = urlState.slice(parsersStart, parsersEnd);

    expect(parsers).not.toContain('createOpen');
    expect(parsers).toContain('editPolicySetId');
    expect(parsers).toContain('simulatePolicySetId');
  });
});
