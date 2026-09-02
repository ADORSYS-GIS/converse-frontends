import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Against real temp files, not a fully mocked `fs`: `brandingConfigFromEnv` is mocked (this
 * route's only real collaborator besides `node:fs`) to point `logoPath` at a file this suite
 * actually writes to a temp directory, so `statSync`/`readFileSync` inside the route run for
 * real. `branding.ts`'s own parsing/validation is covered separately in `branding.test.ts` — this
 * file only exercises the route's own behaviour.
 */
const brandingConfigMock = vi.fn();
vi.mock('../../../lib/server/branding', () => ({
  brandingConfigFromEnv: () => brandingConfigMock(),
}));

describe('GET /branding/logo', () => {
  let dir: string;
  let GET: typeof import('./route').GET;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lci-branding-logo-'));
    brandingConfigMock.mockReset();
    ({ GET } = await import('./route'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function request(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3001/branding/logo', { headers });
  }

  it('answers 404 when branding is unconfigured', async () => {
    brandingConfigMock.mockReturnValue({});
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('answers 404 when configured but the file is missing on disk', async () => {
    brandingConfigMock.mockReturnValue({
      logoPath: join(dir, 'does-not-exist.png'),
      logoContentType: 'image/png',
    });
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('streams the configured file with the right Content-Type and an ETag', async () => {
    const logoPath = join(dir, 'logo.png');
    writeFileSync(logoPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    brandingConfigMock.mockReturnValue({ logoPath, logoContentType: 'image/png' });

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('ETag')).toMatch(/^".+-.+"$/);

    const body = Buffer.from(await response.arrayBuffer());
    expect(body).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('answers 304 with no body when If-None-Match matches the current ETag', async () => {
    const logoPath = join(dir, 'logo.svg');
    writeFileSync(logoPath, '<svg></svg>');
    brandingConfigMock.mockReturnValue({ logoPath, logoContentType: 'image/svg+xml' });

    const first = await GET(request());
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await GET(request({ 'if-none-match': etag as string }));
    expect(second.status).toBe(304);
    const body = await second.text();
    expect(body).toBe('');
  });

  it('does not answer 304 when If-None-Match is stale', async () => {
    const logoPath = join(dir, 'logo.png');
    writeFileSync(logoPath, 'v1');
    brandingConfigMock.mockReturnValue({ logoPath, logoContentType: 'image/png' });

    const response = await GET(request({ 'if-none-match': '"stale-etag"' }));
    expect(response.status).toBe(200);
  });
});
