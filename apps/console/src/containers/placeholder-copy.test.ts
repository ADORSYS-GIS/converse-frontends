import { describe, expect, it } from 'vitest';

import * as overviewZonesModule from './use-account-overview-zones';
import * as projectsScreenModule from './use-projects-screen';

/**
 * console-ui#326 — regression coverage for the ticket's own Test Plan ("grep-based regression
 * check that no user-visible string cites 'follow-up 3' or 'follow-up 4' as an open item").
 *
 * `MANAGE_SPEND_PENDING_MESSAGE` (this file's original third subject, alongside
 * `USAGE_PENDING_MESSAGE`/`LATENCY_BLOCKED_MESSAGE`) is gone entirely as of the 2026-08-30 Projects
 * revamp brief — Spend MTD is a real, wired, sortable column now (`use-projects-screen.ts`'s
 * `applyProjectSpend`), so the permanent "this screen does not query the usage backend" banner
 * would itself be a false claim on the very screen it sat on. What survives from that subject is
 * the SAME regression concern the other two below already apply: the module must not export any
 * such string at all any more, not merely a corrected one.
 *
 * `NEW_PROJECT_PENDING`/`REPORT_EXPORT_PENDING` (an earlier version of this test's other two
 * subjects) are gone along with the placeholders they described — tickets #303/#309 built the real
 * project-creation and report-export paths, so there is no more "isn't available yet" string to
 * regression-test.
 *
 * `LATENCY_BLOCKED_MESSAGE` is gone too, along with the whole panel-wide "isn't available" claim
 * it carried. The panel it captioned went on to be wired for real (SPEND/BUDGET-style, per-series
 * honesty) and then, per the 2026-08-30 phase 9.2 owner directive, removed outright: the usage
 * backend's events are aggregate metric signals with no per-request duration, so LATENCY could
 * never honestly fill regardless of how it was wired. Either way, this module has no business
 * exporting a blanket "isn't available" string for it.
 *
 * `OVERVIEW_EXPORT_UNAVAILABLE_CAPTION` is gone too (shell revamp phase 2, 2026-08-30) — the
 * Overview EXPORT control it captioned is deleted outright rather than left permanently disabled;
 * export gets wired for real in phase 4, at which point it becomes a live `PageHeader.action`
 * with no disabled-reason caption to test at all.
 *
 * The Overview subject is `use-account-overview-zones.ts` since C12 (converse-frontends#455):
 * `use-overview-screen.ts` was deleted when the page moved onto `dashboards.yaml`, and what is
 * left of it — the budget card, the billing-period stat row and the export dialog — is where any
 * such caption would now have to live. The assertions are unchanged: this module must not export
 * a blanket "isn't available" claim about a zone at all.
 */
describe('placeholder copy (console-ui#326)', () => {
  it('no longer exports a permanent "spend is unwired" message — Spend MTD is a real column now', () => {
    expect('MANAGE_SPEND_PENDING_MESSAGE' in projectsScreenModule).toBe(false);
    const values: unknown[] = Object.values(projectsScreenModule);
    for (const value of values) {
      if (typeof value !== 'string') continue;
      expect(value).not.toMatch(/does not query the usage backend/i);
      expect(value).not.toMatch(/spend.{0,40}not shown here yet/i);
    }
  });

  it('no longer exports an Overview export-unavailable caption — the control is deleted, not disabled', () => {
    expect('OVERVIEW_EXPORT_UNAVAILABLE_CAPTION' in overviewZonesModule).toBe(false);
  });

  // #304-#307 (Epic 4 Story 4.2), extended by this story to LATENCY: SPEND/SPEND SHARE/BUDGET/
  // LATENCY are all wired to the usage backend now, so this module must no longer export any
  // blanket "isn't available"/"unwired" copy for the Overview screen at all — the panel is
  // honest PER SERIES (`latencyFootnote`) rather than through a permanent blocked-panel message.
  it('no longer exports a blanket latency-unavailable/blocked message', () => {
    expect('LATENCY_BLOCKED_MESSAGE' in overviewZonesModule).toBe(false);
    const values: unknown[] = Object.values(overviewZonesModule);
    for (const value of values) {
      if (typeof value !== 'string') continue;
      expect(value).not.toMatch(/latency.{0,40}isn'?t available/i);
      expect(value).not.toMatch(/latency or percentile/i);
    }
  });
});
