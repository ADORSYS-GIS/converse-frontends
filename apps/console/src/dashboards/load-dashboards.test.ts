import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  consoleConfigDir,
  DASHBOARDS_FILE_NAME,
  dashboardsLookupPaths,
  loadDashboards,
  loadDashboardsFrom,
  resetDashboardsCache,
} from './load-dashboards';

const VALID = `pages:
  - route: /admin/override
    filters: []
    panels:
      - id: total
        type: stat
        title: Total cost
        span: 1
        metric: cost
        query:
          scope: all
          limit: 100
`;

const BROKEN = `pages:
  - route: /admin/override
    filters: []
    panels:
      - id: bad
        type: pie
        title: A filled disk
        span: 1
        metric: cost
        query:
          scope: all
          limit: 100
`;

const ENV_KEYS = ['CONSOLE_CONFIG', 'CONSOLE_CONFIG_DIR', 'CONSOLE_DASHBOARDS'] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  resetDashboardsCache();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetDashboardsCache();
});

function tempDirWith(name: string, contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'console-dashboards-'));
  writeFileSync(join(dir, name), contents, 'utf8');
  return dir;
}

describe('consoleConfigDir', () => {
  it('is null in a plain dev checkout — the repo root is never treated as a config volume', () => {
    expect(consoleConfigDir()).toBeNull();
  });

  it('derives from CONSOLE_CONFIG, so a deployment needs no second env var', () => {
    process.env.CONSOLE_CONFIG = '/config/console/config.yaml';
    expect(consoleConfigDir()).toBe('/config/console');
  });

  it('lets an explicit CONSOLE_CONFIG_DIR win when the two are deliberately apart', () => {
    process.env.CONSOLE_CONFIG = '/config/console/config.yaml';
    process.env.CONSOLE_CONFIG_DIR = '/mnt/dashboards';
    expect(consoleConfigDir()).toBe('/mnt/dashboards');
  });
});

describe('lookup order (owner ruling Q11 — overridable via the config volume)', () => {
  it('puts the config-volume copy first and the in-repo file last', () => {
    process.env.CONSOLE_CONFIG_DIR = '/config/console';
    const paths = dashboardsLookupPaths();
    expect(paths[0]).toBe(join('/config/console', DASHBOARDS_FILE_NAME));
    expect(paths.at(-1)).toContain(DASHBOARDS_FILE_NAME);
    expect(paths.at(-1)).not.toContain('/config/console');
  });

  it('has only the in-repo file when no config volume is configured', () => {
    expect(dashboardsLookupPaths()).toHaveLength(1);
  });

  it('reads the override when one is present', () => {
    process.env.CONSOLE_CONFIG_DIR = tempDirWith(DASHBOARDS_FILE_NAME, VALID);
    expect(loadDashboards().pages[0].route).toBe('/admin/override');
  });

  it('falls back to the in-repo file when the volume has none', () => {
    process.env.CONSOLE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'console-empty-'));
    expect(loadDashboards().pages.some((page) => page.route === '/admin/usage')).toBe(true);
  });

  it('caches for the process, and reloads once the cache is dropped', () => {
    const first = loadDashboards();
    expect(loadDashboards()).toBe(first);
    resetDashboardsCache();
    expect(loadDashboards()).not.toBe(first);
  });
});

describe('fail-loud', () => {
  /** The AC: "an INVALID OVERRIDE fails loud with the same message shape" — never a silent
   *  fallback to the in-repo file, which would serve a different dashboard than was deployed. */
  it('refuses to start on an invalid override rather than falling back', () => {
    process.env.CONSOLE_CONFIG_DIR = tempDirWith(DASHBOARDS_FILE_NAME, BROKEN);
    expect(() => loadDashboards()).toThrow(/\/admin\/override/);
    expect(() => loadDashboards()).toThrow(/bad/);
  });

  it('names the file on unparseable YAML', () => {
    const dir = tempDirWith(DASHBOARDS_FILE_NAME, 'pages: [\n  - unclosed');
    process.env.CONSOLE_CONFIG_DIR = dir;
    expect(() => loadDashboards()).toThrow(/Failed to parse dashboards file/);
  });

  it('names the file when it cannot be read at all', () => {
    expect(() => loadDashboardsFrom('/definitely/not/here.yaml')).toThrow(
      /Could not read dashboards file/
    );
  });

  it('says where it looked when nothing exists anywhere', () => {
    process.env.CONSOLE_DASHBOARDS = '/definitely/not/here.yaml';
    expect(() => loadDashboards()).toThrow(/No dashboards file found/);
  });
});
