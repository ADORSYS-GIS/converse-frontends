import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ServiceConfig } from './config.js';
import { parseRenderRequest } from './render-request.js';
import { checkTypst, renderPdf } from './render.js';
import {
  BROKEN_TEMPLATE,
  GOLDEN_ASSETS,
  GOLDEN_DATA,
  GOLDEN_TEMPLATE,
} from './test-support/fixtures.js';
import { readPdfInfo } from './test-support/pdf-info.js';
import {
  TYPST_MISSING_MESSAGE,
  typstAvailable,
  typstVersion,
} from './test-support/typst-binary.js';

const config: ServiceConfig = { ...DEFAULT_CONFIG, typstBin: process.env.TYPST_BIN || 'typst' };

/** A private temp root so "did the service clean up after itself" is answerable by counting. */
let tmpRoot: string;

beforeAll(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'typst-render-tests-'));
});

afterAll(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

function requestOf(body: unknown) {
  const parsed = parseRenderRequest(body);
  if (!parsed.ok) throw new Error(`fixture is not a valid request: ${parsed.message}`);
  return parsed.request;
}

describe.skipIf(!typstAvailable)(`renderPdf (against real ${typstVersion})`, () => {
  it('golden: template + data.json + an SVG asset produce a valid two-page PDF', async () => {
    const outcome = await renderPdf(
      requestOf({ template: GOLDEN_TEMPLATE, data: GOLDEN_DATA, assets: GOLDEN_ASSETS }),
      config,
      { tmpRoot }
    );

    expect(outcome.kind).toBe('pdf');
    if (outcome.kind !== 'pdf') return;

    expect(outcome.pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const info = readPdfInfo(outcome.pdf);
    expect(info).not.toBeNull();
    // The fixture has an explicit `#pagebreak()`: a page count of 1 means the second half of the
    // document was lost, which a `%PDF` header check alone would not catch.
    expect(info?.pageCount).toBe(2);
    // A PDF that embeds a font subset and a rasterised/vector SVG is comfortably over 1 KiB; a
    // truncated stream would not be.
    expect(outcome.pdf.byteLength).toBeGreaterThan(1024);
  });

  it('surfaces Typst stderr verbatim on a compile error', async () => {
    const outcome = await renderPdf(requestOf({ template: BROKEN_TEMPLATE }), config, { tmpRoot });

    expect(outcome.kind).toBe('compile-error');
    if (outcome.kind !== 'compile-error') return;
    expect(outcome.message).toMatch(/unknown variable|error/i);
    expect(outcome.message).toContain('this-function-does-not-exist');
  });

  it('refuses a template that reads outside the render root', async () => {
    const outcome = await renderPdf(requestOf({ template: '#read("/etc/hosts")\n= x\n' }), config, {
      tmpRoot,
    });
    expect(outcome.kind).toBe('compile-error');
  });

  it('reports an over-cap PDF as output-too-large instead of returning it', async () => {
    const outcome = await renderPdf(
      requestOf({ template: GOLDEN_TEMPLATE, data: GOLDEN_DATA, assets: GOLDEN_ASSETS }),
      { ...config, maxOutputBytes: 32 },
      { tmpRoot }
    );
    expect(outcome.kind).toBe('output-too-large');
  });

  it('kills a compile that overruns the timeout', async () => {
    // Not `#while true`: Typst detects that statically and fails fast with a compile error, which
    // would make this test pass for the wrong reason. A very large but finite page loop is real
    // work — measured at ~1.9 s for 30 000 pages locally, so a million pages against a 400 ms
    // ceiling can only end one way, on any machine.
    const outcome = await renderPdf(
      requestOf({ template: '#for i in range(1000000) [ Page #i #pagebreak() ]\n' }),
      { ...config, compileTimeoutMs: 400 },
      { tmpRoot }
    );
    expect(outcome.kind).toBe('timeout');
  });

  it('leaves no temp directory behind, on success or failure', async () => {
    const before = await fs.readdir(tmpRoot);
    await renderPdf(requestOf({ template: GOLDEN_TEMPLATE, data: GOLDEN_DATA }), config, {
      tmpRoot,
    });
    await renderPdf(requestOf({ template: BROKEN_TEMPLATE }), config, { tmpRoot });
    expect(await fs.readdir(tmpRoot)).toEqual(before);
  });

  it('reports an unresolvable package import as a compile error, not a hang', async () => {
    // NOTE ON WHAT THIS DOES AND DOES NOT PROVE. `--package-path`/`--package-cache-path` point at
    // an empty per-request directory, so nothing is pre-cached — but Typst will still reach out to
    // the @preview registry when the host has egress, which a developer laptop does. Verified
    // directly: `@preview/cetz:0.3.1` DOWNLOADS and compiles here. Offline-ness is therefore a
    // deployment property (no egress on the sidecar pod), not something this process enforces, and
    // the README says so. What is testable everywhere is the failure shape: a package that exists
    // in no registry surfaces as a compile error with the package name, never as a 30 s hang.
    const outcome = await renderPdf(
      requestOf({ template: '#import "@preview/lightbridge-not-a-real-package:9.9.9": *\n= x\n' }),
      { ...config, compileTimeoutMs: 20_000 },
      { tmpRoot }
    );
    expect(outcome.kind).toBe('compile-error');
    if (outcome.kind !== 'compile-error') return;
    expect(outcome.message).toContain('lightbridge-not-a-real-package');
  });
});

describe('checkTypst', () => {
  it.skipIf(!typstAvailable)('reports healthy with the binary version', async () => {
    const health = await checkTypst(config);
    expect(health.healthy).toBe(true);
    expect(health.detail).toMatch(/^typst /);
  });

  it('reports unhealthy when the binary is missing', async () => {
    const health = await checkTypst({ ...config, typstBin: 'typst-does-not-exist-xyzzy' });
    expect(health.healthy).toBe(false);
    expect(health.detail).toMatch(/ENOENT|not.*found|spawn/i);
  });
});

if (!typstAvailable) {
  console.warn(TYPST_MISSING_MESSAGE);
}
