import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/budget-schedules` and `/admin/budget-schedules/create` (converse-frontends#451, story
 * C8) — the SAME server-side role gate every other `/admin/*` route uses.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any markup.
 * `notFound()` and not a 403, so a non-admin does not learn the route exists at all. This is still
 * only the UI half — `lightbridge-authz` gates all five schedule procedures at
 * `budget:schedule-manage` regardless (`authz.cstack`), so a forged session could at most render a
 * degraded screen.
 */
const LIST_SEGMENT = join('src', 'app', '(console)', 'admin', 'budget-schedules', 'page.tsx');
const CREATE_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'admin',
  'budget-schedules',
  'create',
  'page.tsx'
);

describe('the /admin/budget-schedules permission gate', () => {
  it.each([
    ['the list route', LIST_SEGMENT],
    ['the create route', CREATE_SEGMENT],
  ])(
    'decrypts the session and 404s a caller without budget:schedule-manage on %s',
    (_name, segment) => {
      const source = readFileSync(join(process.cwd(), segment), 'utf8');

      expect(source).toContain('readSession()');
      expect(source).toContain('can(session, PERMISSION.budgetScheduleManage)');
      expect(source).toContain('notFound()');
    }
  );

  it('gates the one nav surface that links to it, cosmetic but must not regress into "shown then 404s"', () => {
    // converse-frontends#452: `adminNavGroups` filters EACH row against the caller's own permission
    // set, declared beside the row's href in `ADMIN_DESTINATIONS`, so the row and this segment's
    // own `notFound()` read the same string and cannot drift apart.
    const chrome = readFileSync(join(process.cwd(), 'src', 'client', 'console-chrome.tsx'), 'utf8');

    expect(chrome).toContain("'budget-schedules'");
    expect(chrome).toContain('export function adminNavGroups');
    expect(chrome).toContain('permission: PERMISSION.budgetScheduleManage');
  });

  it('never renders the list and the form on the same view — the same mode split one route over', () => {
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-budget-schedules-centre.tsx'),
      'utf8'
    );

    expect(centre).toContain('function BudgetSchedulesListView');
    expect(centre).toContain('function BudgetScheduleEditView');

    const dispatcherStart = centre.indexOf('export function AdminBudgetSchedulesCentre');
    const dispatcherEnd = centre.indexOf('function BudgetScheduleEditView');
    const dispatcher = centre.slice(dispatcherStart, dispatcherEnd);

    expect(dispatcher).toContain("screen.mode === 'edit'");
    expect((dispatcher.match(/return </g) ?? []).length).toBe(2);
    expect(dispatcher).not.toMatch(/<>/);
    expect(dispatcher).not.toMatch(/return \[/);
  });

  /**
   * The honesty caption is a NON-FUNCTIONAL acceptance criterion of the story, and it is the one
   * thing on this screen a reader cannot infer from anything else: a schedule changes the ledger
   * balance and the minted budget tier, and NOT what a request experiences at the Envoy gateway,
   * until lightbridge-authz Phase 6a lands
   * (`lightbridge-authz/docs/governance-model-and-enforcement.md:540-551`).
   *
   * Pinned here, on the route's own gate test, because it is the kind of sentence a later
   * "tidy the subtitle" change deletes without anyone noticing it was load-bearing.
   */
  it('states the enforcement gap on the page and on its loading boundary', () => {
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-budget-schedules-centre.tsx'),
      'utf8'
    );
    const loading = readFileSync(
      join(process.cwd(), 'src', 'app', '(console)', 'admin', 'budget-schedules', 'loading.tsx'),
      'utf8'
    );

    expect(centre).toContain('RESET_SCHEDULE_ENFORCEMENT_CAPTION');
    expect(loading).toContain('RESET_SCHEDULE_ENFORCEMENT_CAPTION');
  });
});
