import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `GET /branding/override.css` (issue #368, Phase H) — against a real temp file, mirroring
 * `../logo/route.test.ts`. `branding-css-filter.ts` has its own thorough unit coverage; this file
 * only exercises the ROUTE's own behaviour: unconfigured -> 404, missing-on-disk -> 404,
 * configured -> 200 with the filtered body and `text/css`, and that the filter's stripped-entries
 * side effect (a `console.warn`) fires only when something was actually stripped.
 */
const serverEnvMock = vi.fn();
vi.mock('../../../server/env', () => ({
  serverEnv: () => serverEnvMock(),
}));

describe('GET /branding/override.css', () => {
  let dir: string;
  let GET: typeof import('./route').GET;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'console-branding-css-'));
    serverEnvMock.mockReset();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ({ GET } = await import('./route'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    warnSpy.mockRestore();
  });

  it('answers 404 when branding is unconfigured', async () => {
    serverEnvMock.mockReturnValue({ branding: undefined });
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it('answers 404 when branding.style is configured but the file is missing on disk', async () => {
    serverEnvMock.mockReturnValue({
      branding: { stylePath: join(dir, 'does-not-exist.style') },
    });
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it('serves the filtered stylesheet as text/css', async () => {
    const stylePath = join(dir, 'override.style');
    writeFileSync(
      stylePath,
      '[data-theme="black"] {\n  --color-primary: #ff6600;\n  color: red;\n}'
    );
    serverEnvMock.mockReturnValue({ branding: { stylePath } });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');

    const body = await response.text();
    expect(body).toBe('[data-theme="black"] {\n  --color-primary: #ff6600;\n}');
  });

  it('logs a warning naming what was stripped, without failing the response', async () => {
    const stylePath = join(dir, 'override.style');
    writeFileSync(stylePath, '.evil {\n  display: none;\n}\n:root {\n  --a: 1;\n}');
    serverEnvMock.mockReturnValue({ branding: { stylePath } });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('stripped 1 selector(s)');
    expect(warnSpy.mock.calls[0][1]).toMatchObject({ strippedSelectors: ['.evil'] });
  });

  it('serves a clean file with no warning at all', async () => {
    const stylePath = join(dir, 'override.style');
    writeFileSync(stylePath, ':root {\n  --color-primary: #ff6600;\n}');
    serverEnvMock.mockReturnValue({ branding: { stylePath } });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
