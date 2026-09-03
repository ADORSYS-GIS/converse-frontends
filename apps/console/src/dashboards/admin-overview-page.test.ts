import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { findPage, parseDashboardsFile } from './dashboard-spec';
import type { DashboardPageSpec } from './dashboard-spec';
import { resolveDashboard } from './resolve-dashboard';

/**
 * `/admin/overview`'s own YAML entry, asserted against what the hand-written page it replaced drew
 * (converse-frontends#447, story C4).
 *
 * This is the PARITY oracle the story asks for on the data side; the Storybook page story is the
 * one on the visual side. It exists because "the eight boards became panels" is a claim that can
 * rot silently: a panel dropped from the document, a `group_by` quietly widened, an honesty
 * caption deleted along with the container that used to render it — none of those break a type or
 * a render, and every one of them is a regression an operator would only notice by missing a
 * number they used to have.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');
const ROUTE = '/admin/overview';

function adminOverview(): DashboardPageSpec {
  const file = parseDashboardsFile(
    parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')),
    REPO_DASHBOARDS
  );
  const page = findPage(file, ROUTE);
  if (!page) throw new Error(`dashboards.yaml has no "${ROUTE}" entry`);
  return page;
}

/** The window the page's own `mtd` default resolves to at the end of a 31-day month — long
 *  enough that the one-week comparison floor never widens it, so the assertions below are about
 *  the SPEC, not about calendar arithmetic (`comparison-window.test.ts` owns that). */
const WINDOW = {
  start: new Date('2026-08-01T00:00:00.000Z'),
  end: new Date('2026-08-29T00:00:00.000Z'),
};

describe('/admin/overview in dashboards.yaml', () => {
  it('declares every board the hand-written page drew, under stable ids', () => {
    expect(adminOverview().panels.map((panel) => panel.id)).toEqual([
      // 1 — estate spend over time (both halves)
      'estate-spend',
      'spend-by-account',
      // 2 — model mix (share + over time)
      'model-mix-share',
      'spend-by-model',
      // 3 — top spenders, split by what a row IS so each links to the right actor type
      'top-spender-accounts',
      'top-spender-projects',
      // 6 — request volume
      'request-volume',
      // 7 — latency
      'latency-by-model',
      // 8 — adoption
      'active-accounts',
      'active-projects',
      'adoption-over-time',
    ]);
  });

  it('owns no filters of its own — the estate is not scoped by anything but the range', () => {
    expect(adminOverview().filters).toEqual([]);
  });

  it('queries the whole estate on every panel, never one account', () => {
    for (const panel of adminOverview().panels) {
      expect(panel.query.scope, panel.id).toBe('all');
      expect(panel.query.scope_id, panel.id).toBeUndefined();
    }
  });

  it('keeps each board on the axis transform its predecessor defaulted to', () => {
    const scaleOf = (id: string) =>
      adminOverview().panels.find((panel) => panel.id === id)?.options?.scale;
    // Request COUNT shares an axis with nothing; `indexed` is the honest shape reading.
    expect(scaleOf('request-volume')).toBe('indexed');
    // One model at ~95% share flattens every other line on a linear axis.
    expect(scaleOf('spend-by-model')).toBe('log');
    expect(scaleOf('estate-spend')).toBe('linear');
    expect(scaleOf('spend-by-account')).toBe('linear');
    expect(scaleOf('adoption-over-time')).toBe('linear');
  });

  it('links top-spender rows at the FINAL /admin/usage URLs, by actor type', () => {
    const linkOf = (id: string) =>
      adminOverview().panels.find((panel) => panel.id === id)?.options?.link;
    expect(linkOf('top-spender-accounts')).toBe('/admin/usage/actors/:key?type=account');
    expect(linkOf('top-spender-projects')).toBe('/admin/usage/actors/:key?type=project');
  });

  it('says what a top-spender row IS rather than calling an account an "actor"', () => {
    const options = (id: string) =>
      adminOverview().panels.find((panel) => panel.id === id)?.options;
    expect(options('top-spender-accounts')).toMatchObject({
      rowLabel: 'Account',
      unit: 'accounts',
    });
    expect(options('top-spender-projects')).toMatchObject({
      rowLabel: 'Project',
      unit: 'projects',
    });
  });

  /**
   * The honesty captions the deleted containers used to render as `InlineStatus` lines. They are
   * panel subtitles now, and a subtitle is rendered by `DashboardPanel` in both chromes (a `bare`
   * stat panel keeps its own, by that component's explicit contract) — so this asserts the FACT
   * each caption states, not its exact wording.
   */
  it('carries every honesty caption its predecessor rendered', () => {
    const subtitleOf = (id: string) =>
      adminOverview().panels.find((panel) => panel.id === id)?.subtitle ?? '';

    // The error-rate gap: usage events carry no error/status field at all.
    expect(subtitleOf('request-volume')).toContain('lightbridge-authz#597');

    // Latency: per-bucket percentiles, worst bucket stated, never an average of percentiles.
    expect(subtitleOf('latency-by-model')).toMatch(/per bucket/i);
    expect(subtitleOf('latency-by-model')).toMatch(/never an average of percentiles/i);

    // Adoption: a distinct count over a usage-EVENTS query can only ever see actors that drew
    // something — a dormant account is invisible to it, not counted as inactive.
    expect(subtitleOf('active-accounts')).toMatch(/usage in this window/i);
    expect(subtitleOf('active-accounts')).toMatch(/never appears/i);

    // Unassigned spend is a labelled row, never dropped.
    expect(subtitleOf('top-spender-projects')).toMatch(/unassigned/i);
  });

  /**
   * The dedupe claim, checked rather than asserted in a comment (an explicit AC: "the number of
   * usage requests is FEWER than today's one-per-board, and the PR records the before/after
   * count").
   *
   * BEFORE: the deleted `use-admin-overview-screen.ts` declared six `useQuery` calls for eight
   * boards — `modelQuery`, `previousQuery`, `projectActivityQuery`, `mtdQuery`, `prevMtdQuery`,
   * `latencyQuery` — none shared, several differing only by `group_by`.
   * AFTER: eleven panels resolve to FOUR, one of which is the comparison twin the old page also
   * fetched. The budget-pressure zone's own billing-period request (one now, two before) is not
   * part of this page entry at all — see `admin-estate-operations-usage.ts`.
   */
  it('resolves eleven panels to four requests, one of them the comparison twin', () => {
    const page = adminOverview();
    const resolved = resolveDashboard({ page, window: WINDOW });

    expect(page.panels).toHaveLength(11);
    expect(resolved.queries).toHaveLength(4);

    const indexOf = (id: string) =>
      resolved.panels.find((panel) => panel.spec.id === id)?.queryIndex;

    // The two ungrouped panels (estate spend, request volume) genuinely share one request…
    expect(indexOf('estate-spend')).toBe(indexOf('request-volume'));

    // …the model share, the model series and the latency cards share a second…
    expect(indexOf('model-mix-share')).toBe(indexOf('spend-by-model'));
    expect(indexOf('model-mix-share')).toBe(indexOf('latency-by-model'));

    // …and every account/project-grained panel shares a third, `group_by` ORDER notwithstanding:
    // the dedupe key sorts the dimensions, while each panel reads its own first one.
    const accountGrained = [
      'spend-by-account',
      'top-spender-accounts',
      'top-spender-projects',
      'active-accounts',
      'active-projects',
      'adoption-over-time',
    ].map(indexOf);
    expect(new Set(accountGrained).size).toBe(1);

    // Exactly one panel compares, and its twin is a real, separate query.
    const comparing = resolved.panels.filter((panel) => panel.compareQueryIndex !== undefined);
    expect(comparing.map((panel) => panel.spec.id)).toEqual(['estate-spend']);
    expect(comparing[0].compareQueryIndex).not.toBe(comparing[0].queryIndex);
  });

  it('shifts the comparison twin forward by exactly one window, so the two overlay', () => {
    const resolved = resolveDashboard({ page: adminOverview(), window: WINDOW });
    const estate = resolved.panels.find((panel) => panel.spec.id === 'estate-spend');
    // Monthly cadence (the estate default): 1 August − 1 July, on the calendar.
    expect(estate?.compareShiftMs).toBe(
      Date.UTC(2026, 7, 1) - Date.UTC(2026, 6, 1) // 31 days
    );
    // Monthly cadence, so the twin is the same days of the previous calendar month.
    expect(estate?.compareWindow?.start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
});
