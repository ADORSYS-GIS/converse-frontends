import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin` is one route with two sections (`?section=overview|refills`), and BOTH are behind the
 * same grant that reveals the Admin nav group.
 *
 * The gate is server-side and per SEGMENT: a parallel-route slot is its own route segment, so a
 * `notFound()` in `children` does not by itself stop `@rail` or `@scope` from rendering. Adding a
 * second section to the area is exactly the kind of change that can quietly acquire a fourth
 * segment without one — the operator dashboard reads account-wide spend, latency and budget, so a
 * missing gate there leaks strictly more than the refill queue ever did.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * TREE: every `(console)/admin` segment must decrypt the session and `notFound()` a non-admin
 * before generating any admin markup. `notFound()` and not a 403, so a non-admin does not learn
 * the route exists at all. This is still only the UI half — `lightbridge-authz` enforces the real
 * permission on every procedure regardless.
 */
const ADMIN_SEGMENTS = [
  join('src', 'app', '(console)', 'admin', 'page.tsx'),
  join('src', 'app', '(console)', '@rail', 'admin', 'page.tsx'),
  join('src', 'app', '(console)', '@scope', 'admin', 'page.tsx'),
];

describe('the /admin role gate', () => {
  it.each(ADMIN_SEGMENTS)('%s decrypts the session and 404s a non-admin', (segment) => {
    const source = readFileSync(join(process.cwd(), segment), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('isAdmin(session.user.roles)');
    expect(source).toContain('notFound()');
  });

  it('gates every segment under (console)/admin, with none left ungated', () => {
    // Guards the failure mode this file exists for: a new segment added beside these three (a
    // section-specific slot, a nested route) that forgets the gate. If this list grows, the
    // `it.each` above must grow with it.
    const layout = readFileSync(
      join(process.cwd(), 'src', 'app', '(console)', 'layout.tsx'),
      'utf8'
    );

    // The nav group itself stays hidden for a non-admin — cosmetic, but it must not regress into
    // "shown and then 404s", which advertises the area to everyone.
    expect(layout).toContain('showAdmin: session.isAdmin');
  });
});
