import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `GET /branding/logo-light` (per-theme logos addendum to issue #368, Phase H) — against real temp
 * files, not a fully mocked `fs`, mirroring `../logo/route.test.ts` exactly (same collaborator,
 * same fixture strategy): `serverEnv()` is mocked to point `branding.logoLightPath` at a file this
 * suite actually writes to a temp directory, so `statSync`/`readFileSync` inside the route run for
 * real. `env.ts`'s own parsing/validation (host-absolute path, extension allow-list, the
 * `logoLight`-requires-`logo` rule) is covered separately in `server/env.test.ts` — this file only
 * exercises the route's own behaviour: unconfigured -> 404, missing-on-disk -> 404, configured ->
 * 200 with the right headers and bytes, and the ETag/304 revalidation path.
 */
const serverEnvMock = vi.fn();
vi.mock('../../../server/env', () => ({
  serverEnv: () => serverEnvMock(),
}));

describe('GET /branding/logo-light', () => {
  let dir: string;
  let GET: typeof import('./route').GET;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'console-branding-logo-light-'));
    serverEnvMock.mockReset();
    ({ GET } = await import('./route'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function request(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3000/branding/logo-light', { headers });
  }

  it('answers 404 when branding is unconfigured', async () => {
    serverEnvMock.mockReturnValue({ branding: undefined });
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('answers 404 when branding.logo is configured but branding.logoLight is not', async () => {
    serverEnvMock.mockReturnValue({
      branding: { logoPath: join(dir, 'logo.png'), logoContentType: 'image/png' },
    });
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('answers 404 when branding.logoLight is configured but the file is missing on disk', async () => {
    serverEnvMock.mockReturnValue({
      branding: {
        logoLightPath: join(dir, 'does-not-exist.png'),
        logoLightContentType: 'image/png',
      },
    });
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('streams the configured file with the right Content-Type and an ETag', async () => {
    const logoLightPath = join(dir, 'logo-light.png');
    writeFileSync(logoLightPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    serverEnvMock.mockReturnValue({
      branding: { logoLightPath, logoLightContentType: 'image/png' },
    });

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('ETag')).toMatch(/^".+-.+"$/);

    const body = Buffer.from(await response.arrayBuffer());
    expect(body).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('answers 304 with no body when If-None-Match matches the current ETag', async () => {
    const logoLightPath = join(dir, 'logo-light.svg');
    writeFileSync(logoLightPath, '<svg></svg>');
    serverEnvMock.mockReturnValue({
      branding: { logoLightPath, logoLightContentType: 'image/svg+xml' },
    });

    const first = await GET(request());
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await GET(request({ 'if-none-match': etag as string }));
    expect(second.status).toBe(304);
    const body = await second.text();
    expect(body).toBe('');
  });

  it('does not answer 304 when If-None-Match is stale (file changed since)', async () => {
    const logoLightPath = join(dir, 'logo-light.png');
    writeFileSync(logoLightPath, 'v1');
    serverEnvMock.mockReturnValue({
      branding: { logoLightPath, logoLightContentType: 'image/png' },
    });

    const response = await GET(request({ 'if-none-match': '"stale-etag"' }));
    expect(response.status).toBe(200);
  });
});
