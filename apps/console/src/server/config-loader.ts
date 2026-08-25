import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { parse as parseYaml } from 'yaml';

/**
 * Generic YAML-document + environment-variable-interpolation loading, mirroring
 * lightbridge-authz's `config/default.yaml` (owner directive): the YAML file is the primary
 * config document, and `.env`/deploy-time environment variables only back the handful of
 * placeholders the document actually references — see
 * `~/dev/gis/lightbridge-authz/crates/lightbridge-authz-core/src/config/mod.rs`
 * (`interpolate_env_vars`) and that repo's `AGENTS.md` "Environment Variable Interpolation"
 * section for the reference implementation this one is modeled on.
 *
 * DIVERGENCE FROM AUTHZ (both deliberate, per this port's owner directive):
 *
 * 1. Placeholder syntax. authz supports four forms: `$VAR`, `${VAR}`, `${VAR-default}` (default
 *    only when unset), `${VAR:-default}` (default when unset OR empty). This loader supports only
 *    `{env:VAR}` — no inline default-value operator at all. A value that wants a dev-safe default
 *    with no environment override is simply written as a plain YAML literal instead of a
 *    placeholder (see `config.yaml`'s `keycloak.issuer`/`backendUrl`/etc — not secrets, so they're
 *    literals); a value that must always come from the environment (a real secret, e.g.
 *    `session.secret`) is written as a bare `{env:VAR}` and nothing else. A real deployment that
 *    needs a *different* literal (a different Keycloak issuer, say) ships its own `config.yaml` and
 *    points `CONSOLE_CONFIG` at it, rather than overriding one field via env.
 *
 * 2. Missing-variable behavior. authz's bare `$VAR`/`${VAR}` (no default) silently resolves to an
 *    empty string when the variable is unset, deferring "is this actually required" entirely to
 *    downstream field validation — a service can start successfully on a blank required value and
 *    fail later in a less obvious place. This loader keeps that same silent-empty-string behavior
 *    only when a placeholder is *embedded* inside a larger string (there's no sensible way to
 *    represent "half of a string is undefined"), but when a placeholder is the *entire* value of a
 *    YAML scalar, an unset or empty variable resolves the whole field to `undefined` rather than
 *    `""`. `env.ts`'s `requiredField` then sees an absent value for a required key and fails fast
 *    at startup with a message naming both the config key and the environment variable, instead of
 *    authz's "starts fine, breaks downstream" default.
 */

const PLACEHOLDER_PATTERN = /\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Resolves every `{env:VAR}` placeholder in a single string.
 *
 * - No placeholder present -> the string is returned unchanged (a plain literal).
 * - The *entire* string is exactly one placeholder (e.g. `"{env:SESSION_SECRET}"`) -> resolves to
 *   the variable's value, or `undefined` if the variable is unset or set to an empty string.
 * - One or more placeholders embedded in a larger string (e.g. `"https://{env:HOST}/base"`) ->
 *   each occurrence is substituted with the variable's value, or `''` if unset — matching authz's
 *   `$VAR`/`${VAR}` behavior, since a string can't be "partially undefined".
 */
export function resolveEnvPlaceholders(raw: string): string | undefined {
  const matches = [...raw.matchAll(PLACEHOLDER_PATTERN)];
  if (matches.length === 0) return raw;

  // This rule exists so a bundler can statically inline a *client-visible* `process.env.FOO`
  // reference into the browser bundle. Neither lookup below ever runs in a browser bundle — this
  // is a server-only Node.js config loader whose whole job is looking up an arbitrary variable
  // name that the YAML document names at runtime, so a dynamic lookup is exactly what's needed.
  const isWholeValue = matches.length === 1 && matches[0][0] === raw;
  if (isWholeValue) {
    // eslint-disable-next-line expo/no-dynamic-env-var
    const value = process.env[matches[0][1]];
    return value === undefined || value === '' ? undefined : value;
  }

  return raw.replace(PLACEHOLDER_PATTERN, (_match, varName: string) => process.env[varName] ?? '');
}

/**
 * Deep-walks a parsed YAML value (object / array / string / number / boolean / null), resolving
 * `{env:VAR}` placeholders in every string leaf. Non-string scalars (numbers, booleans, null) pass
 * through untouched — YAML already typed them.
 */
export function resolveConfigEnv(value: unknown): unknown {
  if (typeof value === 'string') return resolveEnvPlaceholders(value);
  if (Array.isArray(value)) return value.map(resolveConfigEnv);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        resolveConfigEnv(entry),
      ])
    );
  }
  return value;
}

export const DEFAULT_CONFIG_PATH = './config.yaml';

export type ParsedConfigFile = {
  /** The parsed YAML document, before placeholder resolution — kept around so a missing-required-
   *  value error can name the `{env:VAR}` placeholder that produced it. */
  raw: unknown;
  /** The same document with every `{env:VAR}` placeholder resolved. */
  resolved: unknown;
  absolutePath: string;
};

/**
 * Reads, parses, and env-resolves the config document at `configPath` (defaults to `CONSOLE_CONFIG`
 * or `./config.yaml`, resolved against `process.cwd()` — the console app's own directory when run
 * via `pnpm --filter console dev|start` or `turbo run build:web`). Throws a clear, path-naming
 * error on a missing file or invalid YAML; never returns a partial document.
 */
export function parseConfigFile(
  configPath: string = process.env.CONSOLE_CONFIG || DEFAULT_CONFIG_PATH
): ParsedConfigFile {
  const absolutePath = resolvePath(process.cwd(), configPath);

  let text: string;
  try {
    text = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `[console] Could not read config file at "${absolutePath}" ` +
        `(CONSOLE_CONFIG=${process.env.CONSOLE_CONFIG ?? '<unset>'}): ${(error as Error).message}`
    );
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    throw new Error(
      `[console] Failed to parse config file at "${absolutePath}": ${(error as Error).message}`
    );
  }

  return { raw, resolved: resolveConfigEnv(raw), absolutePath };
}

/** Reads a dotted path (`['keycloak', 'issuer']`) out of a parsed config value. */
export function getConfigPath(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}
