import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722). Same server-side permission gate every
 * other `/admin/*` route uses since converse-frontends#452 (`admin-refills-queue-route-gate.test.ts`/
 * `admin-refill-policy-create-route-gate.test.ts` cover their own routes the same way).
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a caller without `account:provision`
 * before generating any markup.
 */
const PROVISION_ACCOUNT_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'admin',
  'provision-account',
  'page.tsx'
);

describe('the /admin/provision-account route gate', () => {
  it('decrypts the session and 404s a caller without account:provision', () => {
    const source = readFileSync(join(process.cwd(), PROVISION_ACCOUNT_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.accountProvision)');
    expect(source).toContain('notFound()');
  });
});
