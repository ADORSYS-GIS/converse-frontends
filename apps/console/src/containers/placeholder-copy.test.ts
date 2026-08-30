import { describe, expect, it } from 'vitest';

import { MANAGE_SPEND_PENDING_MESSAGE } from './use-manage-screen';
import * as overviewScreenModule from './use-overview-screen';

/**
 * console-ui#326 — regression coverage for the ticket's own Test Plan ("grep-based regression
 * check that no user-visible string cites 'follow-up 3' or 'follow-up 4' as an open item").
 *
 * `MANAGE_SPEND_PENDING_MESSAGE`/`USAGE_PENDING_MESSAGE` (renamed `LATENCY_BLOCKED_MESSAGE` by
 * #304-#307, Epic 4 Story 4.2 — Overview's SPEND/BUDGET are wired now, so a string still claiming
 * "unwired" would itself be the #326-class defect this test guards against) used to cite "ADR
 * 0009 follow-ups 4 and 6" — follow-up 4 is the `apps/console` scaffold, already shipped
 * (`docs/adr/0009-nextjs-console-replacement.md`'s own "## Follow-ups" list), so citing it as a
 * reason a dashboard is unwired was simply wrong. None of these strings should carry an ADR
 * follow-up citation, or an internal issue number, any more (see the PR body for the argument
 * against citing internal follow-up/issue numbers in this self-service console's own
 * customer-visible copy at all).
 *
 * `NEW_PROJECT_PENDING`/`REPORT_EXPORT_PENDING` (the previous version of this test's other two
 * subjects) are gone along with the placeholders they described — tickets #303/#309 built the real
 * project-creation and report-export paths, so there is no more "isn't available yet" string to
 * regression-test.
 *
 * `LATENCY_BLOCKED_MESSAGE` is gone too, along with the whole panel-wide "isn't available" claim
 * it carried: the lightbridge-authz usage API now returns `latency_samples`/`latency_p50_ms`/
 * `latency_p95_ms`/`latency_p99_ms` per bucket, so LATENCY is wired the same way SPEND/BUDGET
 * already were (`use-overview-screen.ts`'s `latencySeries`/`latencyStatus`/`latencyFootnote`).
 * What survives from that old test is the SAME regression concern applied to what replaced it: no
 * blanket "isn't available"/"unwired" claim should exist anywhere in this module any more.
 *
 * `OVERVIEW_EXPORT_UNAVAILABLE_CAPTION` is gone too (shell revamp phase 2, 2026-08-30) — the
 * Overview EXPORT control it captioned is deleted outright rather than left permanently disabled;
 * export gets wired for real in phase 4, at which point it becomes a live `PageHeader.action`
 * with no disabled-reason caption to test at all.
 */
const USER_VISIBLE_STRINGS = {
  MANAGE_SPEND_PENDING_MESSAGE,
};

describe('placeholder copy (console-ui#326)', () => {
  it.each(Object.entries(USER_VISIBLE_STRINGS))(
    '%s does not cite an ADR 0009 follow-up or Decision number',
    (_name, message) => {
      expect(message).not.toMatch(/ADR\s*0009/i);
      expect(message).not.toMatch(/follow-?up/i);
    }
  );

  it.each(Object.entries(USER_VISIBLE_STRINGS))(
    '%s does not reference an internal issue number',
    (_name, message) => {
      expect(message).not.toMatch(/#\d+/);
    }
  );

  it('MANAGE_SPEND_PENDING_MESSAGE no longer cites the shipped console scaffold', () => {
    expect(MANAGE_SPEND_PENDING_MESSAGE).not.toMatch(/follow-?up.*4/i);
  });

  it('every remaining placeholder string still states the real reason, not a bare "unavailable"', () => {
    // Regression against over-correcting into content-free copy: each string must still name
    // what's actually missing.
    expect(MANAGE_SPEND_PENDING_MESSAGE).toMatch(/usage backend/);
  });

  it('no longer exports an Overview export-unavailable caption — the control is deleted, not disabled', () => {
    expect('OVERVIEW_EXPORT_UNAVAILABLE_CAPTION' in overviewScreenModule).toBe(false);
  });

  // #304-#307 (Epic 4 Story 4.2), extended by this story to LATENCY: SPEND/SPEND SHARE/BUDGET/
  // LATENCY are all wired to the usage backend now, so this module must no longer export any
  // blanket "isn't available"/"unwired" copy for the Overview screen at all — the panel is
  // honest PER SERIES (`latencyFootnote`) rather than through a permanent blocked-panel message.
  it('no longer exports a blanket latency-unavailable/blocked message', () => {
    expect('LATENCY_BLOCKED_MESSAGE' in overviewScreenModule).toBe(false);
    const values: unknown[] = Object.values(overviewScreenModule);
    for (const value of values) {
      if (typeof value !== 'string') continue;
      expect(value).not.toMatch(/latency.{0,40}isn'?t available/i);
      expect(value).not.toMatch(/latency or percentile/i);
    }
  });
});
