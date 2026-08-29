import { createSerializer } from 'nuqs';
import { isParserBijective } from 'nuqs/testing';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_REVIEW_TABS,
  ADMIN_SECTIONS,
  API_KEY_STATUSES,
  CURRENT_PERIOD,
  MANAGE_BUDGET_STATES,
  MANAGE_STATUSES,
  OVERVIEW_RANGES,
  SECTION_SHEET_IDS,
  URL_PARAM_CONTRACT,
  adminParsers,
  apiKeysParsers,
  manageParsers,
  overviewParsers,
  scopeParsers,
  settingsParsers,
} from './url-state';

/**
 * The URL param contract's own test (ADR 0011: "URLs become part of the product surface: param
 * names are a contract; renames need the same care as API fields").
 *
 * Three properties, in the order they matter:
 *
 *  1. **The names are pinned.** The table below is written out by hand on purpose — it is the
 *     second opinion. A rename in `url-state.ts` that nobody meant to make fails here rather than
 *     silently breaking every bookmark that carried the old name.
 *  2. **Defaults stay out of the URL.** Serializing a screen's default state must produce an empty
 *     query string, and changing one knob must produce a query string carrying exactly that knob.
 *  3. **Every parser round-trips.** Whatever the app writes, a reload must parse back to the same
 *     value — otherwise a shared link restores a *different* view from the one that was shared.
 */

describe('the URL param contract', () => {
  it('pins every param name, per route', () => {
    const names = Object.fromEntries(
      Object.entries(URL_PARAM_CONTRACT).map(([route, { parsers, urlKeys }]) => [
        route,
        Object.keys(parsers)
          .map((key) => (urlKeys as Record<string, string | undefined>)[key] ?? key)
          .sort(),
      ])
    );

    expect(names).toEqual({
      scope: ['account', 'project'],
      overview: ['bucket', 'from', 'group-by', 'model', 'range', 'series', 'to'],
      apiKeys: ['create', 'delete', 'key', 'page', 'q', 'revoke', 'status'],
      manage: [
        'budget-state',
        'create',
        'format',
        'include',
        'page',
        'period',
        'q',
        'report-group',
        'row',
        'status',
      ],
      // `account-name` moved off `manage` with the panel that opens it: a core account mutation
      settings: ['account-name', 'rename'],
      // `/admin` is one route with two sections: the operator overview it lands on carries the
      // same dashboard knobs `/` does (deliberately the same names — see the shared-meaning test
      // below), plus `section` for the sub-nav itself.
      admin: ['bucket', 'from', 'group-by', 'range', 'request', 'section', 'series', 'tab', 'to'],
    });
  });

  it('uses kebab-case on the wire everywhere it needs more than one word', () => {
    for (const { parsers, urlKeys } of Object.values(URL_PARAM_CONTRACT)) {
      for (const key of Object.keys(parsers)) {
        const urlKey = (urlKeys as Record<string, string | undefined>)[key] ?? key;
        expect(urlKey, `${urlKey} must be lower kebab-case`).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    }
  });

  it('gives the two routes that share a param name the same meaning for it', () => {
    // `page`, `q` and `status` appear on both ledgers. That is deliberate — one vocabulary across
    // the product — but it only holds if they keep parsing the same way.
    expect(apiKeysParsers.page.defaultValue).toBe(manageParsers.page.defaultValue);
    expect(apiKeysParsers.search.defaultValue).toBe(manageParsers.search.defaultValue);
    expect(apiKeysParsers.status.defaultValue).toBe(manageParsers.status.defaultValue);
    expect(URL_PARAM_CONTRACT.apiKeys.urlKeys.search).toBe(
      URL_PARAM_CONTRACT.manage.urlKeys.search
    );

    // `range`/`from`/`to`/`bucket`/`group-by`/`series` appear on both `/` and `/admin`. They are
    // the SAME parser instances, not lookalikes — `?range=7d&group-by=model` cannot come to mean
    // one thing on the user dashboard and another on the operator one.
    for (const key of ['range', 'from', 'to', 'bucket', 'groupBy', 'series'] as const) {
      expect(adminParsers[key], `admin.${key} must be overview.${key} itself`).toBe(
        overviewParsers[key]
      );
    }
    expect(URL_PARAM_CONTRACT.admin.urlKeys.groupBy).toBe(
      URL_PARAM_CONTRACT.overview.urlKeys.groupBy
    );
  });

  describe('defaults stay out of the URL', () => {
    it.each(Object.entries(URL_PARAM_CONTRACT))('%s', (_route, { parsers, urlKeys }) => {
      const serialize = createSerializer(parsers, { urlKeys });
      const defaults = Object.fromEntries(
        Object.entries(parsers).map(([key, parser]) => [key, parser.defaultValue])
      );

      expect(serialize(defaults)).toBe('');
    });
  });

  it('writes only the param that actually changed', () => {
    const overview = createSerializer(overviewParsers, {
      urlKeys: URL_PARAM_CONTRACT.overview.urlKeys,
    });
    expect(overview({ range: '7d' })).toBe('?range=7d');
    expect(overview({ range: '30d' })).toBe('');
    expect(overview({ groupBy: 'model' })).toBe('?group-by=model');

    const settings = createSerializer(settingsParsers, {
      urlKeys: URL_PARAM_CONTRACT.settings.urlKeys,
    });
    // The rename target IS the open flag — one param, so the two can never contradict each other.
    expect(settings({ renameProjectId: 'proj_7' })).toBe('?rename=proj_7');
    expect(settings({ renameProjectId: '' })).toBe('');
    expect(settings({ accountNameOpen: true })).toBe('?account-name=true');

    const manage = createSerializer(manageParsers, { urlKeys: URL_PARAM_CONTRACT.manage.urlKeys });
    expect(manage({ search: 'alpha', budgetState: 'no-quota' })).toBe(
      '?q=alpha&budget-state=no-quota'
    );
    // The report's include set is a comma-separated array param, and its default clears itself.
    expect(manage({ include: ['totals'] })).toBe('');
    expect(manage({ include: ['totals', 'per-model'] })).toBe('?include=totals,per-model');
  });

  it('round-trips every parser', () => {
    expect(isParserBijective(scopeParsers.accountId, 'acct_1', 'acct_1')).toBe(true);
    expect(isParserBijective(scopeParsers.projectId, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(overviewParsers.range, '7d', '7d')).toBe(true);
    expect(isParserBijective(overviewParsers.bucket, 'hour', 'hour')).toBe(true);
    expect(isParserBijective(overviewParsers.groupBy, 'model', 'model')).toBe(true);
    expect(isParserBijective(overviewParsers.series, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(apiKeysParsers.page, '3', 3)).toBe(true);
    expect(isParserBijective(apiKeysParsers.status, 'revoked', 'revoked')).toBe(true);
    expect(isParserBijective(apiKeysParsers.search, 'alpha beta', 'alpha beta')).toBe(true);
    expect(isParserBijective(apiKeysParsers.createOpen, 'true', true)).toBe(true);
    expect(isParserBijective(manageParsers.budgetState, 'no-quota', 'no-quota')).toBe(true);
    expect(isParserBijective(manageParsers.period, '2026-07', '2026-07')).toBe(true);
    expect(isParserBijective(manageParsers.format, 'pdf', 'pdf')).toBe(true);
    expect(
      isParserBijective(manageParsers.include, 'totals,per-model', ['totals', 'per-model'])
    ).toBe(true);
    expect(isParserBijective(settingsParsers.accountNameOpen, 'true', true)).toBe(true);
    expect(isParserBijective(settingsParsers.renameProjectId, 'proj_7', 'proj_7')).toBe(true);
    expect(isParserBijective(adminParsers.tab, 'decided', 'decided')).toBe(true);
    expect(isParserBijective(adminParsers.selectedRequestId, 'req_9', 'req_9')).toBe(true);
    expect(isParserBijective(adminParsers.section, 'refills', 'refills')).toBe(true);
  });

  it('falls back to the default rather than crashing on a hand-edited or stale value', () => {
    // A URL is user-editable input and an old bookmark may carry a value the app has since
    // retired. A literal parser returns null for those, which nuqs resolves to the default.
    expect(overviewParsers.range.parse('42y')).toBeNull();
    expect(apiKeysParsers.status.parse('deleted')).toBeNull();
    expect(adminParsers.tab.parse('everything')).toBeNull();
    // A bookmark to a section that no longer exists lands on the landing section, never nowhere.
    expect(adminParsers.section.parse('org-config')).toBeNull();
    expect(adminParsers.section.defaultValue).toBe('overview');
    expect(manageParsers.page.parse('not-a-number')).toBeNull();
  });

  it('keeps every closed vocabulary in step with the type it claims to satisfy', () => {
    expect(OVERVIEW_RANGES).toEqual(['7d', '30d', '90d']);
    expect(API_KEY_STATUSES).toEqual(['all', 'active', 'revoked']);
    expect(MANAGE_STATUSES).toEqual(['all', 'active', 'suspended']);
    expect(MANAGE_BUDGET_STATES).toEqual(['all', 'quota-set', 'no-quota']);
    expect(ADMIN_REVIEW_TABS).toEqual(['pending', 'decided']);
    expect(ADMIN_SECTIONS).toEqual(['overview', 'refills']);
    expect(SECTION_SHEET_IDS).toEqual(['view', 'filters', 'export', 'scope', 'report']);
  });

  it('defaults the report period to the current month, resolved once', () => {
    expect(CURRENT_PERIOD).toMatch(/^\d{4}-\d{2}$/);
    expect(manageParsers.period.defaultValue).toBe(CURRENT_PERIOD);
  });
});
