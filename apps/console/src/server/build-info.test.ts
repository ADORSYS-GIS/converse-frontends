import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  consoleBuildFacts,
  NOT_CONFIGURED_CAPTION,
  readBackendBuildInfo,
  toFacts,
} from './build-info';
import type { ConsoleEnv } from './env';

/**
 * `server/build-info.ts` (lightbridge-authz#573).
 *
 * Three responsibilities, tested separately because they fail in different ways:
 *
 *  1. `toFacts` — defensive parsing of a payload that crosses a repository boundary. A field of
 *     the wrong type must be DROPPED, never rendered; `[object Object]` where a SHA belongs is
 *     worse on a diagnostics screen than a missing row.
 *  2. `readBackendBuildInfo` — per-service isolation. One dead backend degrades one row.
 *  3. `consoleBuildFacts` — the two-mechanism split (build-time inline vs runtime image env),
 *     and that an unpackaged build honestly reports only what it has.
 */

vi.mock('./usage-dispatcher', () => ({ usageDispatcher: () => undefined }));

afterEach(() => {
  vi.restoreAllMocks();
});

function env(overrides: Partial<ConsoleEnv> = {}): ConsoleEnv {
  return {
    idp: {
      issuer: 'https://idp.test',
      clientId: 'console',
      scopes: 'openid',
      expectedAudiences: [],
      audienceRequired: true,
      rolesClaim: 'lightbridge_api_roles',
    },
    backendUrl: 'https://api.test',
    apiBasePath: '/api',
    budgetUrl: 'https://budget.test',
    sessionSecret: 'x'.repeat(32),
    ...overrides,
  } as ConsoleEnv;
}

const WIRE = {
  service: 'authz-idp',
  version: '0.8.1',
  gitSha: '509005ede47ed13cd2fbb3be0f7bb5bfbf029039',
  gitShortSha: '509005e',
  gitCommitDate: '2026-09-03T06:12:04+02:00',
  gitDirty: false,
  rustcVersion: 'rustc 1.98.0 (88d9e12ae 2026-08-18)',
  buildTime: '2026-09-03T04:44:10Z',
  imageBuildSha: null,
  imageTag: null,
  imageBuildTime: null,
};

describe('toFacts', () => {
  it('maps the backend wire shape onto the console field names', () => {
    expect(toFacts(WIRE)).toEqual({
      version: '0.8.1',
      commitSha: '509005ede47ed13cd2fbb3be0f7bb5bfbf029039',
      commitShortSha: '509005e',
      commitDate: '2026-09-03T06:12:04+02:00',
      dirty: false,
      toolchain: 'rustc 1.98.0 (88d9e12ae 2026-08-18)',
      builtAt: '2026-09-03T04:44:10Z',
      imageSha: undefined,
      imageTag: undefined,
      imageBuiltAt: undefined,
    });
  });

  it('drops a field of the wrong type rather than rendering it', () => {
    const facts = toFacts({ ...WIRE, gitSha: { nope: true }, gitDirty: 'yes' });
    expect(facts.commitSha).toBeUndefined();
    // A non-boolean `gitDirty` is absent, not coerced to `true` — a build wrongly flagged dirty
    // would send someone chasing a deployment problem that does not exist.
    expect(facts.dirty).toBeUndefined();
  });

  it('treats a blank string as absent', () => {
    expect(toFacts({ ...WIRE, imageTag: '   ' }).imageTag).toBeUndefined();
  });
});

describe('readBackendBuildInfo', () => {
  it('reads /version from the idp issuer and the usage backend', async () => {
    const fetchMock = vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify({
            ...WIRE,
            service: input.includes('usage') ? 'authz-usage' : 'authz-idp',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
    );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const results = await readBackendBuildInfo(env({ usageUrl: 'https://usage.test' }));

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://idp.test/version',
      'https://usage.test/version',
    ]);
    expect(results.map((r) => r.status)).toEqual(['ready', 'ready']);
  });

  it('reports an unconfigured usage backend as unavailable, never as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify(WIRE), { status: 200 })
      ) as unknown as typeof fetch
    );

    const [, usage] = await readBackendBuildInfo(env({ usageUrl: undefined }));

    // "Not deployed here" and "deployed but unreachable" are different facts and the screen renders
    // them differently — collapsing them would send an operator debugging a service that is
    // deliberately absent.
    expect(usage).toEqual({
      id: 'authz-usage',
      status: 'unavailable',
      caption: NOT_CONFIGURED_CAPTION,
    });
  });

  it('degrades one service without taking the other down, and never leaks the URL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input.includes('idp')) {
          throw new Error('connect ECONNREFUSED https://idp.internal.svc:3000/version');
        }
        return new Response(JSON.stringify(WIRE), { status: 200 });
      }) as unknown as typeof fetch
    );

    const [idp, usage] = await readBackendBuildInfo(env({ usageUrl: 'https://usage.test' }));

    expect(idp.status).toBe('error');
    // The thrown message embeds the internal origin; the rendered one must not. This assertion is
    // the whole reason the catch block discards the error instead of passing its message through.
    expect(idp.status === 'error' && idp.message).toBe('The service did not answer.');
    expect(idp.status === 'error' && idp.message).not.toContain('idp.internal');
    expect(usage.status).toBe('ready');
  });

  it('reports a non-2xx as an error carrying the status, not as a ready row', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 503 })) as unknown as typeof fetch
    );

    const [idp] = await readBackendBuildInfo(env());
    expect(idp).toEqual({
      id: 'authz-idp',
      status: 'error',
      message: 'The service answered 503.',
    });
  });
});

describe('consoleBuildFacts', () => {
  it('combines the build-time commit with the runtime image identity', () => {
    const facts = consoleBuildFacts('0.1.0', {
      NEXT_PUBLIC_BUILD_SHA: 'f95d35ea1c4b90d3f0a2b7e6c8419d5a3b2e7f01',
      IMAGE_BUILD_SHA: 'f95d35ea1c4b90d3f0a2b7e6c8419d5a3b2e7f01',
      IMAGE_TAG: 'ghcr.io/adorsys-gis/converse-frontends/console:sha-f95d35e',
      IMAGE_BUILD_TIME: '2026-09-03T05:41:00Z',
    });

    expect(facts.version).toBe('0.1.0');
    expect(facts.commitShortSha).toBe('f95d35e');
    expect(facts.imageTag).toBe('ghcr.io/adorsys-gis/converse-frontends/console:sha-f95d35e');
  });

  it('reports only the package version for a build that was never packaged', () => {
    // `next dev`: no inlined commit, no image. The honest answer is the version and nothing else —
    // not an em dash, not "unknown", just no rows for facts that do not exist.
    const facts = consoleBuildFacts('0.1.0', {});
    expect(facts).toEqual({
      version: '0.1.0',
      commitSha: undefined,
      commitShortSha: undefined,
      imageSha: undefined,
      imageTag: undefined,
      imageBuiltAt: undefined,
    });
  });
});
