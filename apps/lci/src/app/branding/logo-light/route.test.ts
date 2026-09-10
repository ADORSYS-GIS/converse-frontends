import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const brandingConfigMock = vi.fn();
vi.mock('../../../lib/server/branding', () => ({
  brandingConfigFromEnv: () => brandingConfigMock(),
}));

describe('GET /branding/logo-light', () => {
  let dir: string;
  let GET: typeof import('./route').GET;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lci-branding-logo-light-'));
    brandingConfigMock.mockReset();
    ({ GET } = await import('./route'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function request(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3001/branding/logo-light', { headers });
  }

  it('answers 404 when branding is unconfigured', async () => {
    brandingConfigMock.mockReturnValue({});
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('answers 404 when configured but the file is missing on disk', async () => {
    brandingConfigMock.mockReturnValue({
      logoLightPath: join(dir, 'does-not-exist.png'),
      logoLightContentType: 'image/png',
    });
    const response = await GET(request());
    expect(response.status).toBe(404);
  });

  it('streams the configured file with the right Content-Type and an ETag', async () => {
    const logoLightPath = join(dir, 'logo-light.png');
    writeFileSync(logoLightPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    brandingConfigMock.mockReturnValue({ logoLightPath, logoLightContentType: 'image/png' });

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');

    const body = Buffer.from(await response.arrayBuffer());
    expect(body).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('answers 304 with no body when If-None-Match matches the current ETag', async () => {
    const logoLightPath = join(dir, 'logo-light.svg');
    writeFileSync(logoLightPath, '<svg></svg>');
    brandingConfigMock.mockReturnValue({ logoLightPath, logoLightContentType: 'image/svg+xml' });

    const first = await GET(request());
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await GET(request({ 'if-none-match': etag as string }));
    expect(second.status).toBe(304);
  });
});
