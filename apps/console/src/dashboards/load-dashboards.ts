import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';

import { parse as parseYaml } from 'yaml';

import { DEFAULT_CONFIG_PATH } from '../server/config-loader';
import { parseDashboardsFile } from './dashboard-spec';
import type { DashboardsFile } from './dashboard-spec';

/**
 * Loads and validates `dashboards.yaml` (converse-frontends#446, decision D-K; owner Q11:
 * "overridable via the config volume, fail-loud on startup").
 *
 * **Lookup order**, covered by a test:
 *  1. `${CONSOLE_CONFIG_DIR}/dashboards.yaml` — the deployment's own copy, so an operator can add
 *     or remove a panel in production without a rebuild. The directory is the SAME volume the
 *     console already mounts its config and branding from (`charts/converse-console` mounts a
 *     ConfigMap at `/config/console/config.yaml` and points `CONSOLE_CONFIG` at it), so this
 *     needs no new mount concept — ai-helm-values B2 only has to add the key.
 *  2. The in-repo `apps/console/dashboards.yaml` — the fallback, and what every dev and every
 *     un-overridden deployment reads.
 *
 * `CONSOLE_CONFIG_DIR` is DERIVED rather than being a second, independently-settable path: a
 * deployment that sets only `CONSOLE_CONFIG` (which is what the Helm chart does today) gets the
 * directory that file lives in, so the override lands beside the config it belongs with instead of
 * needing a second env var wired through the chart. An explicit `CONSOLE_CONFIG_DIR` still wins
 * when someone genuinely wants them apart.
 *
 * **Fail-loud, always.** An unreadable, unparseable or invalid document throws with the offending
 * page and panel id named (`formatDashboardIssues`) — the console refuses to start rather than
 * rendering an empty dashboard, which is the failure mode this replaces: a hand-written container
 * that silently drew nothing when its query shape was wrong.
 *
 * The result is cached for the process lifetime, like `serverEnv()`: the document cannot change
 * without a restart, and every server component rendering a dashboard page reads it.
 */

export const DASHBOARDS_FILE_NAME = 'dashboards.yaml';

/** The in-repo document, resolved against the console app's own directory (`process.cwd()` when
 *  run via `pnpm --filter console dev|start` or `next build`, exactly like `config.yaml`). */
export const DEFAULT_DASHBOARDS_PATH = `./${DASHBOARDS_FILE_NAME}`;

/**
 * The config VOLUME root, or `null` when this deployment has none.
 *
 * Derivation order: an explicit `CONSOLE_CONFIG_DIR`, else the directory holding `CONSOLE_CONFIG`,
 * else nothing (a dev checkout with no `CONSOLE_CONFIG` set has no override root, and must not
 * accidentally treat the repo root as one).
 */
export function consoleConfigDir(): string | null {
  const explicit = process.env.CONSOLE_CONFIG_DIR;
  if (explicit && explicit.length > 0) return resolvePath(process.cwd(), explicit);

  const configPath = process.env.CONSOLE_CONFIG;
  if (!configPath || configPath.length === 0 || configPath === DEFAULT_CONFIG_PATH) return null;

  return dirname(resolvePath(process.cwd(), configPath));
}

/** Every candidate path, most specific first — exported so the lookup ORDER itself is testable
 *  without reading files. */
export function dashboardsLookupPaths(): string[] {
  const paths: string[] = [];
  const configDir = consoleConfigDir();
  if (configDir) paths.push(join(configDir, DASHBOARDS_FILE_NAME));
  const inRepo = process.env.CONSOLE_DASHBOARDS ?? DEFAULT_DASHBOARDS_PATH;
  paths.push(isAbsolute(inRepo) ? inRepo : resolvePath(process.cwd(), inRepo));
  return paths;
}

/** Reads, parses and validates the document at `absolutePath`. Throws, never returns a partial. */
export function loadDashboardsFrom(absolutePath: string): DashboardsFile {
  let text: string;
  try {
    text = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `[console] Could not read dashboards file at "${absolutePath}": ${(error as Error).message}`
    );
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    throw new Error(
      `[console] Failed to parse dashboards file at "${absolutePath}": ${(error as Error).message}`
    );
  }

  return parseDashboardsFile(raw, absolutePath);
}

let cached: DashboardsFile | null = null;

/**
 * The validated dashboards document for this process.
 *
 * An override that EXISTS but is invalid is a hard failure — it is never silently skipped in
 * favour of the in-repo fallback. An operator who mounted a broken file needs to be told, not
 * quietly served a different dashboard than the one they deployed.
 */
export function loadDashboards(): DashboardsFile {
  if (cached) return cached;

  const candidates = dashboardsLookupPaths();
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `[console] No dashboards file found. Looked at:\n${candidates.map((p) => `  - ${p}`).join('\n')}`
    );
  }

  cached = loadDashboardsFrom(found);
  return cached;
}

/** Test-only: drops the process cache so a test can change the environment and reload. */
export function resetDashboardsCache(): void {
  cached = null;
}
