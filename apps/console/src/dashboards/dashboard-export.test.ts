import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { dashboardExportUrl, exportRangeEcho } from './dashboard-export';

describe('dashboardExportUrl', () => {
  it('sends the ROUTE PATTERN as `path`, with the param values beside it', () => {
    const url = dashboardExportUrl({
      route: '/admin/usage/actors/[actorId]',
      range: 'mtd',
      filters: { actorId: 'usr_abc', type: 'user' },
      format: 'pdf',
      includeTables: true,
    });
    const params = new URL(url, 'http://localhost').searchParams;

    // The pattern, not the browser's current URL: the route validates `path` by equality against
    // its own document, so a concrete path never has to be matched back to a pattern.
    expect(params.get('path')).toBe('/admin/usage/actors/[actorId]');
    expect(params.get('actorId')).toBe('usr_abc');
    expect(params.get('type')).toBe('user');
  });

  it('states the include-tables choice explicitly in both directions', () => {
    const on = new URL(
      dashboardExportUrl({ route: '/a', range: 'mtd', format: 'pdf', includeTables: true }),
      'http://x'
    );
    const off = new URL(
      dashboardExportUrl({ route: '/a', range: 'mtd', format: 'csv', includeTables: false }),
      'http://x'
    );

    // Explicit, not omitted-means-default: a bookmarked URL must give back the same document.
    expect(on.searchParams.get('tables')).toBe('true');
    expect(off.searchParams.get('tables')).toBe('false');
  });

  it('carries an explicit span when the page has one, and omits it otherwise', () => {
    const withSpan = new URL(
      dashboardExportUrl({
        route: '/a',
        range: '30d',
        from: '2026-08-01',
        to: '2026-08-08',
        format: 'pdf',
        includeTables: true,
      }),
      'http://x'
    );
    const without = new URL(
      dashboardExportUrl({ route: '/a', range: '30d', format: 'pdf', includeTables: true }),
      'http://x'
    );

    expect(withSpan.searchParams.get('from')).toBe('2026-08-01');
    expect(without.searchParams.has('from')).toBe(false);
  });

  it('drops an undefined filter rather than sending an empty value', () => {
    // An empty `scope_id` is not "no actor" — it is a different query. `resolve-dashboard.ts`
    // refuses it on the server; this keeps the client from sending it in the first place.
    const url = new URL(
      dashboardExportUrl({
        route: '/a',
        range: 'mtd',
        filters: { actorId: undefined },
        format: 'pdf',
        includeTables: true,
      }),
      'http://x'
    );

    expect(url.searchParams.has('actorId')).toBe(false);
  });
});

describe('exportRangeEcho', () => {
  it('states the window as UTC days — the precision the range picker actually offers', () => {
    expect(
      exportRangeEcho('This month', {
        start: new Date('2026-09-01T00:00:00Z'),
        end: new Date('2026-09-14T11:22:33Z'),
      })
    ).toBe('This month · 2026-09-01 – 2026-09-14 · UTC');
  });
});

/**
 * The hard-cutover assertion the story asks for by name: "a grep returns nothing" for the
 * hand-rolled PDF writer. A parallel path left behind is exactly what "hard cutover" forbids, and
 * a deletion is the one kind of change a normal unit test cannot observe.
 */
describe('hard cutover — the hand-rolled PDF writer is gone', () => {
  const consoleRoot = resolve(__dirname, '../..');

  it('has no pdf-document.ts or consumption-pdf.ts left on disk', () => {
    expect(existsSync(resolve(consoleRoot, 'src/server/pdf-document.ts'))).toBe(false);
    expect(existsSync(resolve(consoleRoot, 'src/server/consumption-pdf.ts'))).toBe(false);
    expect(existsSync(resolve(consoleRoot, 'src/server/pdf-document.test.ts'))).toBe(false);
    expect(existsSync(resolve(consoleRoot, 'src/server/consumption-pdf.test.ts'))).toBe(false);
  });

  it('has nothing left IMPORTING them', () => {
    // `grep -r` over `src/`, exit code 1 (no match) is the passing outcome. Import statements
    // only — the prose in the migration's own doc comments names the deleted files on purpose.
    let matches = '';
    try {
      matches = execFileSync(
        'grep',
        ['-rn', "from '.*\\(pdf-document\\|consumption-pdf\\)'", resolve(consoleRoot, 'src')],
        { encoding: 'utf8' }
      );
    } catch {
      /* grep exits 1 when nothing matched — that is the pass */
    }
    expect(matches).toBe('');
  });
});
