import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REPORT_ASSET_BUDGET_BYTES, collectTemplateAssets } from './template-assets';

/**
 * The files that travel WITH a route's template (owner feedback 2026-09-03: "a way to pass custom
 * templates WITH embedded logos in prod").
 *
 * Both roots are pointed at fixture trees here — `CONSOLE_TEMPLATES_DIR` for the operator's mount
 * and `CONSOLE_TEMPLATES_ROOT` for the shipped one — so the precedence rule is tested as a rule
 * rather than against whatever happens to be in `apps/console/templates`.
 */

const ORIGINAL_DIR = process.env.CONSOLE_TEMPLATES_DIR;
const ORIGINAL_ROOT = process.env.CONSOLE_TEMPLATES_ROOT;

let overrideRoot: string;
let shippedRoot: string;

beforeEach(() => {
  overrideRoot = mkdtempSync(join(tmpdir(), 'console-tpl-override-'));
  shippedRoot = mkdtempSync(join(tmpdir(), 'console-tpl-shipped-'));
  process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;
  process.env.CONSOLE_TEMPLATES_ROOT = shippedRoot;
});

afterEach(() => {
  rmSync(overrideRoot, { recursive: true, force: true });
  rmSync(shippedRoot, { recursive: true, force: true });
  if (ORIGINAL_DIR === undefined) delete process.env.CONSOLE_TEMPLATES_DIR;
  else process.env.CONSOLE_TEMPLATES_DIR = ORIGINAL_DIR;
  if (ORIGINAL_ROOT === undefined) delete process.env.CONSOLE_TEMPLATES_ROOT;
  else process.env.CONSOLE_TEMPLATES_ROOT = ORIGINAL_ROOT;
  vi.restoreAllMocks();
});

function write(root: string, route: string, relative: string, contents: string | Buffer): void {
  const path = join(root, ...route.split('/').filter(Boolean), ...relative.split('/'));
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, contents);
}

function paths(outcome: ReturnType<typeof collectTemplateAssets>): string[] {
  if (!outcome.ok) throw new Error(`expected ok, got ${outcome.message}`);
  return outcome.files.map((file) => file.path).sort();
}

describe('collectTemplateAssets', () => {
  it('is empty for a route with no template directory anywhere', () => {
    expect(paths(collectTemplateAssets('/admin/overview'))).toEqual([]);
  });

  /** The headline case: a mounted override directory carrying its own logo beside its own `.typ`. */
  it('picks up a logo sitting beside an override report.typ', () => {
    write(overrideRoot, '/admin/overview', 'report.typ', '#import "_lib/report.typ": *');
    write(overrideRoot, '/admin/overview', 'logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const outcome = collectTemplateAssets('/admin/overview');
    if (!outcome.ok) throw new Error(outcome.message);

    // `logo.png`, NOT `admin/overview/logo.png`: the path is relative to the template directory,
    // which is what makes the template's own `image("logo.png")` resolve at the render root.
    expect(outcome.files.map((file) => ({ path: file.path, origin: file.origin }))).toEqual([
      { path: 'logo.png', origin: 'override' },
    ]);
    expect(outcome.files[0].bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  });

  it('never ships a .typ file — the template itself is resolved, and the library is not overridable', () => {
    write(overrideRoot, '/admin/overview', 'report.typ', '= x');
    write(overrideRoot, '/admin/overview', 'partial.typ', '= y');
    write(overrideRoot, '/admin/overview', 'logo.svg', '<svg/>');

    expect(paths(collectTemplateAssets('/admin/overview'))).toEqual(['logo.svg']);
  });

  it('reads nested files with their relative paths', () => {
    write(overrideRoot, '/admin/overview', 'assets/fonts/brand.ttf', 'FONT');
    expect(paths(collectTemplateAssets('/admin/overview'))).toEqual(['assets/fonts/brand.ttf']);
  });

  it('falls back to the shipped directory when the deployment mounts nothing', () => {
    delete process.env.CONSOLE_TEMPLATES_DIR;
    write(shippedRoot, '/admin/overview', 'logo.png', 'SHIPPED');

    const outcome = collectTemplateAssets('/admin/overview');
    if (!outcome.ok) throw new Error(outcome.message);
    expect(outcome.files).toHaveLength(1);
    expect(outcome.files[0].origin).toBe('shipped');
  });

  /** Per FILE, exactly like the template lookup itself: an override of one file leaves the rest. */
  it('lets the override shadow one shipped file while the others still come through', () => {
    write(shippedRoot, '/admin/overview', 'logo.png', 'SHIPPED');
    write(shippedRoot, '/admin/overview', 'watermark.png', 'SHIPPED-WATERMARK');
    write(overrideRoot, '/admin/overview', 'logo.png', 'CUSTOM');

    const outcome = collectTemplateAssets('/admin/overview');
    if (!outcome.ok) throw new Error(outcome.message);

    const byPath = Object.fromEntries(outcome.files.map((file) => [file.path, file]));
    expect(byPath['logo.png'].origin).toBe('override');
    expect(byPath['logo.png'].bytes.toString('utf8')).toBe('CUSTOM');
    expect(byPath['watermark.png'].origin).toBe('shipped');
  });

  it('ignores the dotfile symlink farm a mounted ConfigMap is built from', () => {
    write(overrideRoot, '/admin/overview', '..data/logo.png', 'SNAPSHOT');
    write(overrideRoot, '/admin/overview', 'logo.png', 'REAL');

    expect(paths(collectTemplateAssets('/admin/overview'))).toEqual(['logo.png']);
  });

  /**
   * The cap. It is the renderer's own request cap, enforced here so an oversized mount is refused
   * with a message naming the FILE rather than coming back from the sidecar as an anonymous
   * `payload_too_large`.
   */
  it('refuses an asset set over the budget, naming the biggest file', () => {
    write(overrideRoot, '/admin/overview', 'huge.png', Buffer.alloc(4_096));

    const outcome = collectTemplateAssets('/admin/overview', 1_024);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe('too_large');
    expect(outcome.totalBytes).toBe(4_096);
    expect(outcome.limitBytes).toBe(1_024);
    expect(outcome.message).toContain('huge.png');
  });

  it('accepts an asset set right up to the budget', () => {
    write(overrideRoot, '/admin/overview', 'logo.png', Buffer.alloc(1_024));
    expect(collectTemplateAssets('/admin/overview', 1_024).ok).toBe(true);
  });

  it('states the renderer cap as its default budget', () => {
    expect(REPORT_ASSET_BUDGET_BYTES).toBe(8 * 1024 * 1024);
  });

  it('refuses a route that could escape the template roots before touching the filesystem', () => {
    expect(() => collectTemplateAssets('/admin/../../etc')).toThrow(/Unsafe segment/);
  });
});
