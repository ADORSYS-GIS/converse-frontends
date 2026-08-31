import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/overview` — the operator dashboard route (converse-frontends#368, the admin-area
 * build). A source-shape assertion rather than a render test, the same reasoning
 * `settings-route-gate.test.ts` states for its own routes: the property under test is about the
 * route SEGMENT itself — it must decrypt the session and `notFound()` a non-admin before
 * generating any dashboard markup, and `/admin` must resolve to it rather than dead-ending on a
 * bare segment with no content of its own.
 */
const ADMIN_OVERVIEW_SEGMENT = join('src', 'app', '(console)', 'admin', 'overview', 'page.tsx');
const ADMIN_ROOT_SEGMENT = join('src', 'app', '(console)', 'admin', 'page.tsx');

describe('the /admin/overview role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), ADMIN_OVERVIEW_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('isAdmin(session.user.roles)');
    expect(source).toContain('notFound()');
  });

  it('`/admin` resolves to `/admin/overview` rather than rendering a bare segment', () => {
    const source = readFileSync(join(process.cwd(), ADMIN_ROOT_SEGMENT), 'utf8');

    expect(source).toContain("redirect('/admin/overview')");
  });
});
