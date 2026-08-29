import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = readFileSync(join(process.cwd(), 'src/app/(console)/layout.tsx'), 'utf8');

/**
 * Regression, live 2026-08-29: Overview and Api-Keys reserved an empty 280px rail column, and a
 * client-side Admin → Api-Keys navigation left Admin's "Select a request to review it." rendered
 * on the keys screen.
 *
 * Both came from the same wrong assumption — that a slot rendering `null` makes the shell drop the
 * column. A parallel-route slot is always a truthy React element, and Next only falls back to
 * `default.tsx` on a HARD navigation, so a stale segment survives a client-side move. The layout
 * must gate the slots on the route itself.
 */
describe('console rail routes', () => {
  it('gates both rail slots on the route, not on whether the slot renders something', () => {
    expect(LAYOUT).toContain('rightRail={hasRail ? rail : undefined}');
    expect(LAYOUT).toContain('leftSecondary={hasRail ? scope : undefined}');
  });

  it('never passes the slot through unconditionally', () => {
    expect(LAYOUT).not.toContain('rightRail={rail}');
    expect(LAYOUT).not.toContain('leftSecondary={scope}');
  });

  it('names exactly the two selection-driven routes as having a rail', () => {
    expect(LAYOUT).toMatch(/const hasRail = route === 'manage' \|\| route === 'admin';/);
  });
});
