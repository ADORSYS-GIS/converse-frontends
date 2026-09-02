import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ServiceConfig } from './config.js';
import { createRenderServer } from './server.js';
import {
  BROKEN_TEMPLATE,
  GOLDEN_ASSETS,
  GOLDEN_DATA,
  GOLDEN_TEMPLATE,
} from './test-support/fixtures.js';
import { readPdfInfo } from './test-support/pdf-info.js';
import { typstAvailable, typstVersion } from './test-support/typst-binary.js';

const config: ServiceConfig = {
  ...DEFAULT_CONFIG,
  typstBin: process.env.TYPST_BIN || 'typst',
  // Small enough that a plausible test payload trips it without allocating anything real.
  maxRequestBytes: 4096,
};

const server = createRenderServer(config);
let base = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

/** The JSON error envelope every non-2xx response uses; typed so assertions are not `unknown`. */
interface ErrorBody {
  error: string;
  detail?: string;
  status?: string;
  typst?: string;
}

const jsonOf = async (response: Response): Promise<ErrorBody> =>
  (await response.json()) as ErrorBody;

const post = (body: unknown): Promise<Response> =>
  fetch(`${base}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('GET /healthz', () => {
  it.skipIf(!typstAvailable)(`answers 200 with the ${typstVersion} banner`, async () => {
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await jsonOf(response)).toEqual({
      status: 'ok',
      typst: expect.stringMatching(/^typst /),
    });
  });

  it('answers 503 when the configured binary cannot run', async () => {
    const broken = createRenderServer({ ...config, typstBin: 'typst-does-not-exist-xyzzy' });
    await new Promise<void>((resolve) => broken.listen(0, '127.0.0.1', resolve));
    const port = (broken.address() as AddressInfo).port;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      expect(response.status).toBe(503);
      expect((await jsonOf(response)).status).toBe('unhealthy');
    } finally {
      await new Promise<void>((resolve) => broken.close(() => resolve()));
    }
  });

  it('rejects a non-GET with 405 and an Allow header', async () => {
    const response = await fetch(`${base}/healthz`, { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});

describe('POST /render', () => {
  it.skipIf(!typstAvailable)('returns application/pdf for the golden request', async () => {
    const response = await post({
      template: GOLDEN_TEMPLATE,
      data: GOLDEN_DATA,
      assets: GOLDEN_ASSETS,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');

    const pdf = Buffer.from(await response.arrayBuffer());
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(readPdfInfo(pdf)?.pageCount).toBe(2);
    expect(Number(response.headers.get('content-length'))).toBe(pdf.byteLength);
  });

  it.skipIf(!typstAvailable)('returns 422 with the Typst error on a broken template', async () => {
    const response = await post({ template: BROKEN_TEMPLATE });
    expect(response.status).toBe(422);
    const body = await jsonOf(response);
    expect(body.error).toBe('compile_error');
    expect(body.detail).toContain('this-function-does-not-exist');
  });

  it('returns 413 for a body over the cap', async () => {
    const response = await post({ template: '= x', data: { blob: 'a'.repeat(8192) } });
    expect(response.status).toBe(413);
    expect((await jsonOf(response)).error).toBe('payload_too_large');
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await post('{ not json');
    expect(response.status).toBe(400);
    expect((await jsonOf(response)).error).toBe('bad_request');
  });

  it('returns 400 for an asset name that escapes the render root', async () => {
    const response = await post({ template: '= x', assets: { '../../etc/passwd': 'eA==' } });
    expect(response.status).toBe(400);
    expect((await jsonOf(response)).detail).toContain('../../etc/passwd');
  });

  it('returns 405 for GET /render and 404 for anything else', async () => {
    expect((await fetch(`${base}/render`)).status).toBe(405);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });
});
