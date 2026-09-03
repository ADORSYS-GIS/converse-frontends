import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ParsedConfigFile } from './config-loader';
import {
  __resetServerEnvCacheForTests,
  buildConsoleEnv,
  normalizeBasePath,
  resolveTypstRenderUrl,
  serverEnv,
  trimTrailingSlash,
} from './env';

/** A minimal, valid raw/resolved pair — every test starts here and overrides just what it needs. */
function parsedFrom(
  resolved: Record<string, unknown>,
  raw?: Record<string, unknown>
): ParsedConfigFile {
  return { raw: raw ?? resolved, resolved, absolutePath: '/fake/config.yaml' };
}

const VALID_CONFIG = {
  session: { secret: 'a'.repeat(48) },
  idp: { issuer: 'http://localhost:13444/realms/dev', clientId: 'self-service' },
  backendUrl: 'http://localhost:13000',
};

describe('buildConsoleEnv', () => {
  /**
   * `typstRenderUrl` now falls back to `TYPST_RENDER_URL` (owner feedback 2026-09-03), so every
   * test in this block that asserts on a WHOLE `ConsoleEnv` depends on that variable being
   * absent — and a developer running the live-renderer integration test exports it. Cleared here
   * so the assertions are about the document, not about the shell they were run from.
   */
  const ORIGINAL_RENDER_URL = process.env.TYPST_RENDER_URL;
  beforeEach(() => {
    delete process.env.TYPST_RENDER_URL;
  });
  afterEach(() => {
    if (ORIGINAL_RENDER_URL === undefined) delete process.env.TYPST_RENDER_URL;
    else process.env.TYPST_RENDER_URL = ORIGINAL_RENDER_URL;
  });

  /**
   * The usage query listener requires mTLS and has no bearer-token auth of its own
   * (lightbridge-authz#347/#361), so a half-configured cert block is not "partly working" -- it
   * cannot produce a TLS identity at all. Treating it as configured would turn a config typo into
   * a per-request handshake failure instead of the same honest 503 an unconfigured deployment
   * already gets, which is a far harder thing to diagnose from the outside.
   */
  it.each([
    ['cert without key', { certPath: '/tls.crt' }],
    ['key without cert', { keyPath: '/tls.key' }],
    ['both blank', { certPath: '   ', keyPath: '   ' }],
    ['empty block', {}],
  ])('treats a %s usageClientCert block as unconfigured', (_label, usageClientCert) => {
    const env = buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, usageClientCert }));
    expect(env.usageClientCert).toBeUndefined();
  });

  it('reads a complete usageClientCert block', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        usageClientCert: {
          certPath: '/etc/lightbridge/tls/tls.crt',
          keyPath: '/etc/lightbridge/tls/tls.key',
        },
      })
    );
    expect(env.usageClientCert).toEqual({
      certPath: '/etc/lightbridge/tls/tls.crt',
      keyPath: '/etc/lightbridge/tls/tls.key',
    });
  });

  /**
   * Issue #368 (Phase H, runtime white-label branding). Unlike `usageClientCert` above, `logo`
   * and `style` are independently optional — they back two unrelated routes that each 404 on
   * their own when unset, so there is no half-configured failure mode pairing them.
   */
  it('leaves branding undefined when the block is absent', () => {
    const env = buildConsoleEnv(parsedFrom(VALID_CONFIG));
    expect(env.branding).toBeUndefined();
  });

  it('leaves branding undefined when the block is present but both fields are blank', () => {
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, branding: { logo: '   ', style: '' } })
    );
    expect(env.branding).toBeUndefined();
  });

  it('reads a logo-only branding block, deriving Content-Type from the extension', () => {
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, branding: { logo: '/tmp/branding/logo.png' } })
    );
    expect(env.branding).toEqual({
      logoPath: '/tmp/branding/logo.png',
      logoContentType: 'image/png',
    });
  });

  it('reads a style-only branding block', () => {
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, branding: { style: '/tmp/branding/override.style' } })
    );
    expect(env.branding).toEqual({ stylePath: '/tmp/branding/override.style' });
  });

  it('reads a complete branding block', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        branding: { logo: '/tmp/branding/logo.svg', style: '/tmp/branding/override.style' },
      })
    );
    expect(env.branding).toEqual({
      logoPath: '/tmp/branding/logo.svg',
      logoContentType: 'image/svg+xml',
      stylePath: '/tmp/branding/override.style',
    });
  });

  it.each([
    ['jpg', '/tmp/branding/logo.jpg', 'image/jpeg'],
    ['jpeg', '/tmp/branding/logo.jpeg', 'image/jpeg'],
    ['webp', '/tmp/branding/logo.webp', 'image/webp'],
  ])('derives %s as %s', (_label, logo, contentType) => {
    const env = buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, branding: { logo } }));
    expect(env.branding?.logoContentType).toBe(contentType);
  });

  it('fails fast on a relative branding.logo path', () => {
    expect(() =>
      buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, branding: { logo: 'branding/logo.png' } }))
    ).toThrow(/"branding\.logo" must be a host-absolute path/);
  });

  it('fails fast on a relative branding.style path', () => {
    expect(() =>
      buildConsoleEnv(
        parsedFrom({ ...VALID_CONFIG, branding: { style: 'branding/override.style' } })
      )
    ).toThrow(/"branding\.style" must be a host-absolute path/);
  });

  it('fails fast on an unsupported branding.logo extension', () => {
    expect(() =>
      buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, branding: { logo: '/tmp/branding/logo.gif' } }))
    ).toThrow(/"branding\.logo" must end in one of/);
  });

  it('fails fast on a branding.logo path with no extension at all', () => {
    expect(() =>
      buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, branding: { logo: '/tmp/branding/logo' } }))
    ).toThrow(/"branding\.logo" must end in one of/);
  });

  /**
   * Per-theme logos addendum (owner directive 2026-08-31, "White is for dark themes"):
   * `branding.logoLight` — the light-theme (`wireframe`) counterpart to `logo`. Deliberately NOT
   * independently optional the way `logo`/`style` are — see `buildBrandingConfig`'s own doc
   * comment.
   */
  it('reads a logo + logoLight branding block, deriving Content-Type for each independently', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        branding: { logo: '/tmp/branding/logo.png', logoLight: '/tmp/branding/logo-light.svg' },
      })
    );
    expect(env.branding).toEqual({
      logoPath: '/tmp/branding/logo.png',
      logoContentType: 'image/png',
      logoLightPath: '/tmp/branding/logo-light.svg',
      logoLightContentType: 'image/svg+xml',
    });
  });

  it('reads a complete branding block including logoLight and style', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        branding: {
          logo: '/tmp/branding/logo.svg',
          logoLight: '/tmp/branding/logo-light.png',
          style: '/tmp/branding/override.style',
        },
      })
    );
    expect(env.branding).toEqual({
      logoPath: '/tmp/branding/logo.svg',
      logoContentType: 'image/svg+xml',
      logoLightPath: '/tmp/branding/logo-light.png',
      logoLightContentType: 'image/png',
      stylePath: '/tmp/branding/override.style',
    });
  });

  it('fails fast on branding.logoLight without branding.logo', () => {
    expect(() =>
      buildConsoleEnv(
        parsedFrom({ ...VALID_CONFIG, branding: { logoLight: '/tmp/branding/logo-light.png' } })
      )
    ).toThrow(/"branding\.logoLight" requires "branding\.logo" to also be set/);
  });

  it('fails fast on a relative branding.logoLight path', () => {
    expect(() =>
      buildConsoleEnv(
        parsedFrom({
          ...VALID_CONFIG,
          branding: { logo: '/tmp/branding/logo.png', logoLight: 'branding/logo-light.png' },
        })
      )
    ).toThrow(/"branding\.logoLight" must be a host-absolute path/);
  });

  it('fails fast on an unsupported branding.logoLight extension', () => {
    expect(() =>
      buildConsoleEnv(
        parsedFrom({
          ...VALID_CONFIG,
          branding: { logo: '/tmp/branding/logo.png', logoLight: '/tmp/branding/logo-light.gif' },
        })
      )
    ).toThrow(/"branding\.logoLight" must end in one of/);
  });

  it('leaves branding undefined when only a blank logoLight is present', () => {
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, branding: { logo: '   ', logoLight: '   ', style: '' } })
    );
    expect(env.branding).toBeUndefined();
  });

  it('builds a full ConsoleEnv from a minimal valid document, applying every default', () => {
    const env = buildConsoleEnv(parsedFrom(VALID_CONFIG));
    expect(env).toEqual({
      idp: {
        issuer: 'http://localhost:13444/realms/dev',
        clientId: 'self-service',
        clientSecret: undefined,
        scopes: 'openid profile email offline_access',
        expectedAudiences: [],
        audienceRequired: true,
        rolesClaim: 'lightbridge_api_roles',
      },
      backendUrl: 'http://localhost:13000',
      apiBasePath: '/api',
      budgetUrl: 'http://localhost:13000', // falls back to backendUrl
      usageUrl: undefined,
      sessionSecret: 'a'.repeat(48),
      publicBaseUrl: undefined,
    });
  });

  it('trims a trailing slash off issuer and backendUrl', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        idp: { ...VALID_CONFIG.idp, issuer: 'http://localhost:13444/realms/dev/' },
        backendUrl: 'http://localhost:13000/',
      })
    );
    expect(env.idp.issuer).toBe('http://localhost:13444/realms/dev');
    expect(env.backendUrl).toBe('http://localhost:13000');
  });

  it('honours an explicit budgetUrl instead of falling back to backendUrl', () => {
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, budgetUrl: 'http://localhost:13005' })
    );
    expect(env.budgetUrl).toBe('http://localhost:13005');
  });

  it('normalises apiBasePath and leaves usageUrl/publicBaseUrl/clientSecret undefined when absent', () => {
    const env = buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, apiBasePath: 'v2' }));
    expect(env.apiBasePath).toBe('/v2');
    expect(env.usageUrl).toBeUndefined();
    expect(env.publicBaseUrl).toBeUndefined();
    expect(env.idp.clientSecret).toBeUndefined();
  });

  it('accepts expectedAudiences as a real YAML array', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        idp: { ...VALID_CONFIG.idp, expectedAudiences: ['converse-frontend', 'other'] },
      })
    );
    expect(env.idp.expectedAudiences).toEqual(['converse-frontend', 'other']);
  });

  it('accepts expectedAudiences as a comma-separated string (single-placeholder escape hatch)', () => {
    const env = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        idp: { ...VALID_CONFIG.idp, expectedAudiences: 'a, b ,c' },
      })
    );
    expect(env.idp.expectedAudiences).toEqual(['a', 'b', 'c']);
  });

  it('coerces a string "false"/"0" audienceRequired (the {env:VAR} case) to a real boolean', () => {
    const asFalseString = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        idp: { ...VALID_CONFIG.idp, audienceRequired: 'false' },
      })
    );
    expect(asFalseString.idp.audienceRequired).toBe(false);

    const asRealBoolean = buildConsoleEnv(
      parsedFrom({
        ...VALID_CONFIG,
        idp: { ...VALID_CONFIG.idp, audienceRequired: false },
      })
    );
    expect(asRealBoolean.idp.audienceRequired).toBe(false);
  });

  it('rejects a session secret shorter than 32 characters', () => {
    expect(() =>
      buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, session: { secret: 'too-short' } }))
    ).toThrow(/at least 32 characters/);
  });

  it('fails fast on a missing required field, naming the config key', () => {
    const { session: _omit, ...withoutSession } = VALID_CONFIG;
    expect(() => buildConsoleEnv(parsedFrom(withoutSession))).toThrow(/"session\.secret"/);
  });

  it('fails fast on a missing required field, naming the {env:VAR} placeholder when that is why', () => {
    const resolved = { ...VALID_CONFIG, session: { secret: undefined } };
    const raw = { ...VALID_CONFIG, session: { secret: '{env:SESSION_SECRET}' } };
    expect(() => buildConsoleEnv(parsedFrom(resolved, raw))).toThrow(
      /"session\.secret" references \{env:SESSION_SECRET\}, but SESSION_SECRET is not set/
    );
  });

  it('fails fast on a missing idp.issuer', () => {
    const { idp, ...rest } = VALID_CONFIG;
    const { issuer: _omit, ...idpWithoutIssuer } = idp;
    expect(() => buildConsoleEnv(parsedFrom({ ...rest, idp: idpWithoutIssuer }))).toThrow(
      /"idp\.issuer"/
    );
  });

  it('fails fast on a missing backendUrl', () => {
    const { backendUrl: _omit, ...rest } = VALID_CONFIG;
    expect(() => buildConsoleEnv(parsedFrom(rest))).toThrow(/"backendUrl"/);
  });

  /**
   * `reports.typstRenderUrl` (owner feedback 2026-09-03).
   *
   * The refusal this fixes was NOT a missing renderer: prod runs the sidecar and the chart sets
   * `TYPST_RENDER_URL` on the console container, but prod supplies its own `config.yaml` text and
   * that document has no `reports:` block, so the `{env:…}` placeholder that would have read the
   * variable never existed in the document being parsed. The variable is therefore read directly,
   * YAML still first.
   */
  it('reads reports.typstRenderUrl from the document, trimming a trailing slash', () => {
    process.env.TYPST_RENDER_URL = 'http://from-the-environment:8080';
    const env = buildConsoleEnv(
      parsedFrom({ ...VALID_CONFIG, reports: { typstRenderUrl: 'http://from-the-document:9090/' } })
    );
    expect(env.typstRenderUrl).toBe('http://from-the-document:9090');
  });

  it('falls back to TYPST_RENDER_URL when the document carries no reports block at all', () => {
    process.env.TYPST_RENDER_URL = 'http://127.0.0.1:8080/';
    const env = buildConsoleEnv(parsedFrom(VALID_CONFIG));
    expect(env.typstRenderUrl).toBe('http://127.0.0.1:8080');
  });

  it.each([
    ['an empty reports block', {}],
    ['a blank value', { typstRenderUrl: '   ' }],
    // The shape a deployment gets when its document DOES carry the placeholder but the chart
    // never set the variable: the loader resolves a bare, wholly-unset `{env:VAR}` to undefined.
    ['an unresolved placeholder', { typstRenderUrl: undefined }],
  ])('falls back to TYPST_RENDER_URL with %s', (_label, reports) => {
    process.env.TYPST_RENDER_URL = 'http://127.0.0.1:8080';
    const env = buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, reports }));
    expect(env.typstRenderUrl).toBe('http://127.0.0.1:8080');
  });

  it.each([
    ['unset', undefined],
    ['blank', '   '],
  ])(
    'stays unconfigured when the document is silent and TYPST_RENDER_URL is %s',
    (_label, value) => {
      if (value === undefined) delete process.env.TYPST_RENDER_URL;
      else process.env.TYPST_RENDER_URL = value;
      expect(buildConsoleEnv(parsedFrom(VALID_CONFIG)).typstRenderUrl).toBeUndefined();
    }
  );

  it('reads branding.name, which is not a path and gets none of the path validation', () => {
    const env = buildConsoleEnv(parsedFrom({ ...VALID_CONFIG, branding: { name: '  adorsys  ' } }));
    expect(env.branding).toEqual({ name: 'adorsys' });
  });
});

describe('resolveTypstRenderUrl', () => {
  it('prefers the document over the environment', () => {
    expect(
      resolveTypstRenderUrl('http://document:1/', { TYPST_RENDER_URL: 'http://environment:2' })
    ).toBe('http://document:1');
  });

  it('uses the environment when the document has nothing', () => {
    expect(resolveTypstRenderUrl(undefined, { TYPST_RENDER_URL: ' http://environment:2/ ' })).toBe(
      'http://environment:2'
    );
  });

  it('is undefined when neither side has anything', () => {
    expect(resolveTypstRenderUrl(undefined, {})).toBeUndefined();
    expect(resolveTypstRenderUrl('  ', { TYPST_RENDER_URL: '  ' })).toBeUndefined();
  });
});

describe('serverEnv (end-to-end, via a real fixture file)', () => {
  const ORIGINAL_ENV = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'console-env-'));
    __resetServerEnvCacheForTests();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
    __resetServerEnvCacheForTests();
  });

  function writeFixture(name: string, contents: string): string {
    const path = join(dir, name);
    writeFileSync(path, contents);
    return path;
  }

  it('loads a full ConsoleEnv from CONSOLE_CONFIG, resolving a real env-backed secret', () => {
    process.env.SESSION_SECRET = 'b'.repeat(40);
    process.env.CONSOLE_CONFIG = writeFixture(
      'config.yaml',
      [
        'session:',
        '  secret: "{env:SESSION_SECRET}"',
        'idp:',
        '  issuer: "http://localhost:13444/realms/dev"',
        '  clientId: "self-service"',
        'backendUrl: "http://localhost:13000"',
      ].join('\n')
    );

    const env = serverEnv();
    expect(env.sessionSecret).toBe('b'.repeat(40));
    expect(env.idp.issuer).toBe('http://localhost:13444/realms/dev');
  });

  it('caches the result: a second call does not re-read the file even if it changes on disk', () => {
    process.env.SESSION_SECRET = 'c'.repeat(40);
    const configPath = writeFixture(
      'config.yaml',
      [
        'session:',
        '  secret: "{env:SESSION_SECRET}"',
        'idp:',
        '  issuer: "http://localhost:13444/realms/dev"',
        '  clientId: "self-service"',
        'backendUrl: "http://localhost:13000"',
      ].join('\n')
    );
    process.env.CONSOLE_CONFIG = configPath;

    const first = serverEnv();
    writeFileSync(configPath, 'backendUrl: "http://changed:1"\n'); // now invalid too (missing fields)
    const second = serverEnv();

    expect(second).toBe(first); // same object identity: no re-read happened
  });

  it('throws naming the missing environment variable when a required placeholder is unset', () => {
    delete process.env.SESSION_SECRET;
    process.env.CONSOLE_CONFIG = writeFixture(
      'config.yaml',
      [
        'session:',
        '  secret: "{env:SESSION_SECRET}"',
        'idp:',
        '  issuer: "http://localhost:13444/realms/dev"',
        '  clientId: "self-service"',
        'backendUrl: "http://localhost:13000"',
      ].join('\n')
    );

    expect(() => serverEnv()).toThrow(/\{env:SESSION_SECRET\}, but SESSION_SECRET is not set/);
  });

  it('throws a clear error naming the path when CONSOLE_CONFIG points at a nonexistent file', () => {
    process.env.CONSOLE_CONFIG = join(dir, 'nope.yaml');
    expect(() => serverEnv()).toThrow(/nope\.yaml/);
  });
});

describe('trimTrailingSlash / normalizeBasePath', () => {
  it('trimTrailingSlash strips exactly one trailing slash', () => {
    expect(trimTrailingSlash('http://x/')).toBe('http://x');
    expect(trimTrailingSlash('http://x')).toBe('http://x');
  });

  it('normalizeBasePath adds a leading slash and strips a trailing one', () => {
    expect(normalizeBasePath('api')).toBe('/api');
    expect(normalizeBasePath('/api/')).toBe('/api');
    expect(normalizeBasePath('/')).toBe('');
  });
});
