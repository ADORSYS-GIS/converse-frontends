import { describe, expect, it } from 'vitest';

import {
  MANAGE_SPEND_PENDING_MESSAGE,
  NEW_PROJECT_PENDING,
  REPORT_EXPORT_PENDING,
} from './use-manage-screen';
import { OVERVIEW_EXPORT_UNAVAILABLE_CAPTION, USAGE_PENDING_MESSAGE } from './use-overview-screen';

/**
 * console-ui#326 — regression coverage for the ticket's own Test Plan ("grep-based regression
 * check that no user-visible string cites 'follow-up 3' or 'follow-up 4' as an open item").
 *
 * `MANAGE_SPEND_PENDING_MESSAGE`/`USAGE_PENDING_MESSAGE` used to cite "ADR 0009 follow-ups 4 and
 * 6" — follow-up 4 is the `apps/console` scaffold, already shipped (`docs/adr/0009-nextjs-
 * console-replacement.md`'s own "## Follow-ups" list), so citing it as a reason a dashboard is
 * unwired was simply wrong. `NEW_PROJECT_PENDING` used to cite "ADR 0009 follow-up 3" — the
 * component-library follow-up, also already shipped. None of these four strings should carry an
 * ADR follow-up citation any more (see the PR body for the argument against citing internal
 * follow-up numbers in this self-service console's own customer-visible copy at all).
 */
const USER_VISIBLE_STRINGS = {
  MANAGE_SPEND_PENDING_MESSAGE,
  USAGE_PENDING_MESSAGE,
  NEW_PROJECT_PENDING,
  REPORT_EXPORT_PENDING,
  OVERVIEW_EXPORT_UNAVAILABLE_CAPTION,
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

  it('NEW_PROJECT_PENDING no longer cites the shipped component-library follow-up', () => {
    expect(NEW_PROJECT_PENDING).not.toMatch(/follow-?up 3/i);
  });

  it('MANAGE_SPEND_PENDING_MESSAGE and USAGE_PENDING_MESSAGE no longer cite the shipped console scaffold', () => {
    expect(MANAGE_SPEND_PENDING_MESSAGE).not.toMatch(/follow-?up.*4/i);
    expect(USAGE_PENDING_MESSAGE).not.toMatch(/follow-?up.*4/i);
  });

  it('every placeholder string still states the real reason, not a bare "unavailable"', () => {
    // Regression against over-correcting into content-free copy: each string must still name
    // what's actually missing.
    expect(MANAGE_SPEND_PENDING_MESSAGE).toMatch(/usage-backend query client/);
    expect(USAGE_PENDING_MESSAGE).toMatch(/usage-backend query client/);
  });
});
