import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { ADMIN_USAGE_LENSES } from '../client/url-state';
import { DASHBOARD_LENSES, findPage, parseDashboardsFile } from './dashboard-spec';
import type { DashboardPageSpec } from './dashboard-spec';
import { resolveDashboard } from './resolve-dashboard';

/**
 * `/admin/usage`'s own YAML entry (converse-frontends#448, story C5).
 *
 * The page has no per-panel query code at all, so this file is where its CONTRACT lives. Three
 * things it pins, each of which could otherwise rot silently — no type breaks, no render breaks,
 * and an operator only notices by missing a number they used to have:
 *
 *  - **The panel ids, in order.** They are a cross-slice contract: C6 reuses them on the
 *    actor/channel/chat routes, C10's report renderer walks them, C11 documents them. A rename
 *    must be a failing test here, not a quiet break in three other slices.
 *  - **The doctrine counts** (ADR 0013 D5, as amended 2026-09-02): `share` exactly once, `donut`
 *    exactly three times, and no panel type outside the sanctioned vocabulary.
 *  - **The dedupe.** Nineteen panels, seven requests — checked by resolving the real entry, not
 *    asserted in a comment.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');
const ROUTE = '/admin/usage';

function adminUsage(): DashboardPageSpec {
  const file = parseDashboardsFile(
    parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')),
    REPO_DASHBOARDS
  );
  const page = findPage(file, ROUTE);
  if (!page) throw new Error(`dashboards.yaml has no "${ROUTE}" entry`);
  return page;
}

const panelOf = (id: string) => adminUsage().panels.find((panel) => panel.id === id);

/** A 30-day window: long enough that the one-week comparison floor never widens it, so these
 *  assertions are about the SPEC rather than about calendar arithmetic. */
const WINDOW = {
  start: new Date('2026-08-01T00:00:00.000Z'),
  end: new Date('2026-08-29T00:00:00.000Z'),
};

describe('/admin/usage in dashboards.yaml', () => {
  it('declares exactly the nineteen contracted panel ids, in order', () => {
    expect(adminUsage().panels.map((panel) => panel.id)).toEqual([
      'total-cost',
      'total-requests',
      'accounts-by-plan',
      'plan-in-use',
      'avg-cost-per-million-tokens',
      'active-actors',
      'cost-by-model',
      'cost-by-actor',
      'tokens-by-model',
      'tokens-by-actor',
      'cost-by-channel',
      'model-cost-share',
      'top-actor-cost',
      'chat-completions-count',
      'model-distribution-requests',
      'model-distribution-cost',
      'model-distribution-tokens',
      'actors-table',
      'channels-table',
    ]);
  });

  it('owns exactly one filter of its own — the lens; range is implicit on every page', () => {
    expect(adminUsage().filters).toEqual(['lens']);
  });

  it("keeps url-state's lens vocabulary and the engine's in agreement, users first", () => {
    expect([...ADMIN_USAGE_LENSES]).toEqual([...DASHBOARD_LENSES]);
    expect(ADMIN_USAGE_LENSES[0]).toBe('user');
  });

  it('queries the whole estate on every panel, never one account', () => {
    for (const panel of adminUsage().panels) {
      expect(panel.query.scope, panel.id).toBe('all');
      expect(panel.query.scope_id, panel.id).toBeUndefined();
    }
  });

  it('sets an explicit limit on every panel — never a server default', () => {
    for (const panel of adminUsage().panels) {
      expect(panel.query.limit, panel.id).toBeGreaterThan(0);
    }
  });

  // ── D5 as amended 2026-09-02: rings allowed, filled disks never ────────────────────────────
  it('uses ShareBar exactly once and the ring exactly three times', () => {
    const types = adminUsage().panels.map((panel) => panel.type);
    expect(types.filter((type) => type === 'share')).toHaveLength(1);
    expect(types.filter((type) => type === 'donut')).toHaveLength(3);
    expect(panelOf('model-cost-share')?.type).toBe('share');
  });

  it('reads all three metrics off the three rings — requests, cost and tokens', () => {
    expect(panelOf('model-distribution-requests')?.metric).toBe('requests');
    expect(panelOf('model-distribution-cost')?.metric).toBe('cost');
    expect(panelOf('model-distribution-tokens')?.metric).toBe('tokens');
    for (const id of [
      'model-distribution-requests',
      'model-distribution-cost',
      'model-distribution-tokens',
    ]) {
      expect(panelOf(id)?.query.group_by, id).toEqual(['model']);
    }
  });

  // ── The comparison pair (D-F) ──────────────────────────────────────────────────────────────
  it('compares exactly the two headline totals against the previous window', () => {
    expect(
      adminUsage()
        .panels.filter((panel) => panel.compare)
        .map((panel) => panel.id)
    ).toEqual(['total-cost', 'total-requests']);
  });

  // ── The lens family ────────────────────────────────────────────────────────────────────────
  it('drives exactly the five actor panels off the lens, all defaulting to user', () => {
    const lensDriven = adminUsage().panels.filter((panel) => panel.options?.lens);
    expect(lensDriven.map((panel) => panel.id)).toEqual([
      'active-actors',
      'cost-by-actor',
      'tokens-by-actor',
      'top-actor-cost',
      'actors-table',
    ]);
    for (const panel of lensDriven) {
      expect(panel.options?.lens, panel.id).toBe('user');
      expect(panel.query.group_by, panel.id).toEqual(['user_id']);
    }
  });

  it('links every actor row at the actor route with the lens carried into ?type=', () => {
    expect(panelOf('top-actor-cost')?.options?.link).toBe('/admin/usage/actors/:key?type=$lens');
    expect(panelOf('actors-table')?.options?.link).toBe('/admin/usage/actors/:key?type=$lens');
  });

  it('links every channel row at the channel route', () => {
    expect(panelOf('cost-by-channel')?.options?.link).toBe('/admin/usage/channels/:key');
    expect(panelOf('channels-table')?.options?.link).toBe('/admin/usage/channels/:key');
    expect(panelOf('cost-by-channel')?.query.group_by).toEqual(['azp']);
  });

  // ── The A3 bridge columns ──────────────────────────────────────────────────────────────────
  it('reads the plan breakdown off [account_id, billing_plan], counting distinct accounts', () => {
    const panel = panelOf('accounts-by-plan');
    expect(panel?.type).toBe('stat-group');
    expect(panel?.metric).toBe('derived:activeActors');
    expect(panel?.query.group_by).toEqual(['account_id', 'billing_plan']);
  });

  it('asks the three chat surfaces in ONE query via operation_in, not three', () => {
    const panel = panelOf('chat-completions-count');
    expect(panel?.metric).toBe('derived:chatCount');
    expect(panel?.query.filters?.operation_in).toEqual([
      'chat_completions',
      'responses',
      'messages',
    ]);
  });

  // ── Tables ─────────────────────────────────────────────────────────────────────────────────
  it('gives the actors table its six contracted columns', () => {
    expect(panelOf('actors-table')?.options?.columns).toEqual([
      'label',
      'type',
      'cost',
      'requests',
      'tokens',
      'lastActive',
    ]);
    expect(panelOf('actors-table')?.options?.unit).toBe('actors');
  });

  it('gives the channels table azp, cost and requests — and no token column', () => {
    expect(panelOf('channels-table')?.options?.columns).toEqual(['label', 'cost', 'requests']);
    expect(panelOf('channels-table')?.options?.rowLabel).toBe('Channel');
    expect(panelOf('channels-table')?.query.group_by).toEqual(['azp']);
  });

  // ── Honesty captions the page owes an operator ─────────────────────────────────────────────
  it('carries the captions that state what these numbers cannot say', () => {
    const subtitleOf = (id: string) => panelOf(id)?.subtitle ?? '';

    // No error/status signal on a usage event at all.
    expect(subtitleOf('total-requests')).toContain('lightbridge-authz#597');
    // A distinct count over a usage-EVENTS query can only see actors that drew something.
    expect(subtitleOf('accounts-by-plan')).toMatch(/never appears/i);
    // A ratio with no denominator is a dash, never $0.00.
    expect(subtitleOf('avg-cost-per-million-tokens')).toMatch(/dash/i);
    // "Last active" is bucket-grained, not an event timestamp.
    expect(subtitleOf('actors-table')).toMatch(/not an event timestamp/i);
  });

  // ── The dedupe, checked rather than claimed ────────────────────────────────────────────────
  it('resolves nineteen panels to seven requests, one of them the comparison twin', () => {
    const page = adminUsage();
    const resolved = resolveDashboard({ page, window: WINDOW, filters: { lens: 'user' } });

    expect(page.panels).toHaveLength(19);
    expect(resolved.queries).toHaveLength(7);

    const indexOf = (id: string) =>
      resolved.panels.find((panel) => panel.spec.id === id)?.queryIndex;

    // The three unfiltered ungrouped stats share one request…
    expect(indexOf('total-cost')).toBe(indexOf('total-requests'));
    expect(indexOf('total-cost')).toBe(indexOf('avg-cost-per-million-tokens'));

    // …every model-grained panel (two series, the share bar and all three rings) shares a second…
    const modelGrained = [
      'cost-by-model',
      'tokens-by-model',
      'model-cost-share',
      'model-distribution-requests',
      'model-distribution-cost',
      'model-distribution-tokens',
    ].map(indexOf);
    expect(new Set(modelGrained).size).toBe(1);

    // …every lens-driven panel shares a third…
    const actorGrained = [
      'active-actors',
      'cost-by-actor',
      'tokens-by-actor',
      'top-actor-cost',
      'actors-table',
    ].map(indexOf);
    expect(new Set(actorGrained).size).toBe(1);

    // …the plan pair shares a fourth (`group_by` ORDER notwithstanding — the dedupe key sorts the
    // dimensions while each panel reads its own first one)…
    expect(indexOf('accounts-by-plan')).toBe(indexOf('plan-in-use'));

    // …and the channel pair a fifth.
    expect(indexOf('cost-by-channel')).toBe(indexOf('channels-table'));

    // The filtered chat query and the comparison twin are the remaining two.
    expect(indexOf('chat-completions-count')).not.toBe(indexOf('total-cost'));
    const comparing = resolved.panels.filter((panel) => panel.compareQueryIndex !== undefined);
    expect(comparing.map((panel) => panel.spec.id)).toEqual(['total-cost', 'total-requests']);
    // Both totals share ONE twin, not one each.
    expect(comparing[0].compareQueryIndex).toBe(comparing[1].compareQueryIndex);
  });

  it('re-groups every lens panel and rewrites every actor link when the lens changes', () => {
    const page = adminUsage();
    const byAccount = resolveDashboard({ page, window: WINDOW, filters: { lens: 'account' } });

    const table = byAccount.panels.find((panel) => panel.spec.id === 'actors-table');
    expect(table?.lens).toBe('account');
    expect(byAccount.queries[table!.queryIndices[0]].group_by).toEqual(['account_id']);
    expect(table?.link).toBe('/admin/usage/actors/:key?type=account');

    // A panel with no `options.lens` is untouched by the knob — the rings stay per-model.
    const ring = byAccount.panels.find((panel) => panel.spec.id === 'model-distribution-cost');
    expect(ring?.lens).toBeUndefined();
    expect(byAccount.queries[ring!.queryIndices[0]].group_by).toEqual(['model']);
  });

  it('still resolves to seven requests under a non-default lens', () => {
    for (const lens of ADMIN_USAGE_LENSES) {
      const resolved = resolveDashboard({ page: adminUsage(), window: WINDOW, filters: { lens } });
      expect(resolved.queries, lens).toHaveLength(7);
    }
  });
});
