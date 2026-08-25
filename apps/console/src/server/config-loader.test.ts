import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getConfigPath,
  parseConfigFile,
  resolveConfigEnv,
  resolveEnvPlaceholders,
} from './config-loader';

describe('resolveEnvPlaceholders', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.LOADER_TEST_VAR = 'resolved-value';
    process.env.LOADER_TEST_EMPTY = '';
    delete process.env.LOADER_TEST_UNSET;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns a plain literal unchanged', () => {
    expect(resolveEnvPlaceholders('http://localhost:13000')).toBe('http://localhost:13000');
  });

  it('resolves a whole-string placeholder to the variable value', () => {
    expect(resolveEnvPlaceholders('{env:LOADER_TEST_VAR}')).toBe('resolved-value');
  });

  it('resolves a whole-string placeholder to undefined when the variable is unset', () => {
    expect(resolveEnvPlaceholders('{env:LOADER_TEST_UNSET}')).toBeUndefined();
  });

  it('resolves a whole-string placeholder to undefined when the variable is set but empty', () => {
    expect(resolveEnvPlaceholders('{env:LOADER_TEST_EMPTY}')).toBeUndefined();
  });

  it('substitutes an embedded placeholder inside a larger string', () => {
    expect(resolveEnvPlaceholders('https://{env:LOADER_TEST_VAR}/base')).toBe(
      'https://resolved-value/base'
    );
  });

  it('substitutes multiple embedded placeholders', () => {
    process.env.LOADER_TEST_VAR_2 = 'second';
    expect(resolveEnvPlaceholders('{env:LOADER_TEST_VAR}-{env:LOADER_TEST_VAR_2}')).toBe(
      'resolved-value-second'
    );
  });

  it('substitutes an unset variable embedded in a larger string as empty, never throwing', () => {
    expect(resolveEnvPlaceholders('prefix-{env:LOADER_TEST_UNSET}-suffix')).toBe('prefix--suffix');
  });
});

describe('resolveConfigEnv', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.LOADER_TEST_VAR = 'resolved-value';
    delete process.env.LOADER_TEST_UNSET;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('deep-walks objects and arrays, resolving every string leaf', () => {
    const input = {
      session: { secret: '{env:LOADER_TEST_VAR}' },
      list: ['{env:LOADER_TEST_VAR}', 'literal'],
      untouched: { number: 42, bool: true, nothing: null },
    };
    expect(resolveConfigEnv(input)).toEqual({
      session: { secret: 'resolved-value' },
      list: ['resolved-value', 'literal'],
      untouched: { number: 42, bool: true, nothing: null },
    });
  });

  it('resolves a required-looking nested placeholder to undefined when unset, not a throw', () => {
    const input = { keycloak: { clientSecret: '{env:LOADER_TEST_UNSET}' } };
    expect(resolveConfigEnv(input)).toEqual({ keycloak: { clientSecret: undefined } });
  });

  it('passes non-string scalars through untouched', () => {
    expect(resolveConfigEnv(42)).toBe(42);
    expect(resolveConfigEnv(true)).toBe(true);
    expect(resolveConfigEnv(null)).toBeNull();
  });
});

describe('getConfigPath', () => {
  it('reads a nested value by dotted path', () => {
    expect(getConfigPath({ keycloak: { issuer: 'x' } }, ['keycloak', 'issuer'])).toBe('x');
  });

  it('returns undefined for a path that does not exist', () => {
    expect(getConfigPath({ keycloak: {} }, ['keycloak', 'issuer'])).toBeUndefined();
    expect(getConfigPath({}, ['keycloak', 'issuer'])).toBeUndefined();
  });

  it('returns undefined rather than throwing when a middle segment is a scalar', () => {
    expect(getConfigPath({ keycloak: 'not-an-object' }, ['keycloak', 'issuer'])).toBeUndefined();
  });
});

describe('parseConfigFile', () => {
  const ORIGINAL_ENV = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'console-config-loader-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it('reads, parses, and env-resolves a real file', () => {
    process.env.LOADER_TEST_SECRET = 'a'.repeat(40);
    const configPath = join(dir, 'config.yaml');
    writeFileSync(
      configPath,
      'session:\n  secret: "{env:LOADER_TEST_SECRET}"\nbackendUrl: "http://localhost:13000"\n'
    );

    const parsed = parseConfigFile(configPath);
    expect(parsed.absolutePath).toBe(configPath);
    expect(getConfigPath(parsed.resolved, ['session', 'secret'])).toBe('a'.repeat(40));
    expect(getConfigPath(parsed.raw, ['session', 'secret'])).toBe('{env:LOADER_TEST_SECRET}');
    expect(getConfigPath(parsed.resolved, ['backendUrl'])).toBe('http://localhost:13000');
  });

  it('honours the CONSOLE_CONFIG env var when no explicit path is given', () => {
    const configPath = join(dir, 'from-env.yaml');
    writeFileSync(configPath, 'backendUrl: "http://from-env-var:9999"\n');
    process.env.CONSOLE_CONFIG = configPath;

    const parsed = parseConfigFile();
    expect(parsed.absolutePath).toBe(configPath);
    expect(getConfigPath(parsed.resolved, ['backendUrl'])).toBe('http://from-env-var:9999');
  });

  it('throws a clear, path-naming error when the file does not exist', () => {
    const missingPath = join(dir, 'does-not-exist.yaml');
    expect(() => parseConfigFile(missingPath)).toThrow(missingPath);
  });

  it('throws a clear, path-naming error on invalid YAML', () => {
    const configPath = join(dir, 'broken.yaml');
    writeFileSync(configPath, 'session:\n  secret: "unterminated\nbackendUrl: [\n');
    expect(() => parseConfigFile(configPath)).toThrow(configPath);
  });
});
