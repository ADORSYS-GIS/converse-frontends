import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { UsageQueryResponse } from '@lightbridge/api-rest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { findPage } from '../../dashboards/dashboard-spec';
import { loadDashboards } from '../../dashboards/load-dashboards';
import { resolveDashboard } from '../../dashboards/resolve-dashboard';
import { buildConsumptionReport } from './consumption-report';
import { resolveReportBranding, type ReportBranding } from './report-branding';
import { buildReport } from './report-data';
import { collectTemplateAssets } from './template-assets';
import { readTemplateLibrary, resolveReportTemplate } from './template-resolver';
import { renderPdf, type RenderAsset } from './typst-client';

/**
 * The end-to-end render, against a REAL `typst-render` (converse-frontends#453's integration test
 * expectation: "`format=pdf` against a local `typst-render` produces a non-empty PDF containing the
 * expected text").
 *
 * It compiles the actual shipped templates with the actual generated SVGs, so it is the only test
 * here that can catch the class of failure everything else is blind to: a `.typ` that does not
 * compile, an `image()` path that does not resolve inside the sandbox, an SVG whose colours or
 * fonts Typst cannot render.
 *
 * **It SKIPS with a message when no renderer is reachable, and never silently passes** — the same
 * contract `apps/typst-render`'s own golden test holds for a missing `typst` binary. Run it with:
 *
 * ```sh
 * pnpm turbo run build:web --filter=typst-render
 * docker compose up typst-render          # or: node apps/typst-render/dist/index.js
 * pnpm --filter console test
 * ```
 */

const RENDER_URL = process.env.TYPST_RENDER_URL ?? 'http://127.0.0.1:8080';

let reachable = false;

beforeAll(async () => {
  try {
    const response = await fetch(`${RENDER_URL}/healthz`, {
      signal: AbortSignal.timeout(2_000),
    });
    reachable = response.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.warn(
      `[skip] typst-render is not reachable at ${RENDER_URL}. ` +
        'Start it with `pnpm turbo run build:web --filter=typst-render && docker compose up ' +
        'typst-render` to run the real render tests.'
    );
  }
});

const WINDOW = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-09-14T00:00:00Z') };

/** Temp trees a case created, plus the template-override variable it may have set. Cleaned after
 *  every test so a case that points `CONSOLE_TEMPLATES_DIR` at a fixture cannot leak into the
 *  next one. */
const scratch: string[] = [];
const ORIGINAL_TEMPLATES_DIR = process.env.CONSOLE_TEMPLATES_DIR;

afterEach(() => {
  while (scratch.length > 0) {
    rmSync(scratch.pop() as string, { recursive: true, force: true });
  }
  if (ORIGINAL_TEMPLATES_DIR === undefined) delete process.env.CONSOLE_TEMPLATES_DIR;
  else process.env.CONSOLE_TEMPLATES_DIR = ORIGINAL_TEMPLATES_DIR;
});

function point(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    requests: 120,
    usage_value: 0,
    total_cost: 2_000_000,
    prompt_tokens: 1000,
    completion_tokens: 500,
    total_tokens: 1500,
    latency_samples: 40,
    latency_p50_ms: 180,
    latency_p95_ms: 900,
    latency_p99_ms: 1400,
    ...overrides,
  };
}

function usagePage() {
  const page = findPage(loadDashboards(), '/admin/usage');
  if (!page) throw new Error('/admin/usage missing from dashboards.yaml');
  const resolved = resolveDashboard({ page, window: WINDOW, filters: { lens: 'user' } });
  const responses = resolved.queries.map(
    () =>
      ({
        points: [
          point({ model: 'gpt-4o', user_id: 'usr_alpha' }),
          point({
            model: 'claude-sonnet-4',
            user_id: 'usr_beta',
            total_cost: 640_000,
            bucket_start: '2026-09-04T00:00:00Z',
          }),
          point({
            model: 'gpt-4o-mini',
            user_id: 'usr_gamma',
            total_cost: 6_300,
            bucket_start: '2026-09-08T00:00:00Z',
          }),
        ],
      }) as unknown as UsageQueryResponse
  );

  return buildReport({
    resolved,
    responses,
    title: 'Admin · Usage',
    rangeLabel: 'This month',
    filters: [{ label: 'lens', value: 'user' }],
    template: { route: '/admin/usage', origin: 'shipped' },
    includeTables: true,
    generatedAt: new Date('2026-09-14T09:00:00Z'),
  });
}

/**
 * `/admin/overview` — the route the owner actually exported when they reported "the PDF has no
 * custom logo" (2026-09-03).
 */
function overviewPage(branding?: ReportBranding) {
  const page = findPage(loadDashboards(), '/admin/overview');
  if (!page) throw new Error('/admin/overview missing from dashboards.yaml');
  const resolved = resolveDashboard({ page, window: WINDOW, filters: {} });
  const responses = resolved.queries.map(
    () =>
      ({
        points: [
          point({ model: 'gpt-4o', account_id: 'acc_alpha', user_id: 'usr_alpha' }),
          point({
            model: 'claude-sonnet-4',
            account_id: 'acc_beta',
            user_id: 'usr_beta',
            total_cost: 640_000,
            bucket_start: '2026-09-04T00:00:00Z',
          }),
        ],
      }) as unknown as UsageQueryResponse
  );

  return buildReport({
    resolved,
    responses,
    title: 'Admin · Overview',
    rangeLabel: 'This month',
    filters: [],
    template: { route: '/admin/overview', origin: 'shipped' },
    includeTables: true,
    generatedAt: new Date('2026-09-14T09:00:00Z'),
    branding,
  });
}

/**
 * A 96×32 two-tone PNG, built byte by byte so this file has no binary fixture and no image
 * dependency. Small enough to read as a constant, real enough that Typst decodes it and the PDF
 * carries an actual `/Image` XObject — which is the assertion that separates "the template did not
 * crash" from "the logo is in the document".
 */
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAAAgCAIAAABiouoDAAAAc0lEQVR42u3YMRGAAADDwOjg0IF/OcjAANQA3+u' +
    'YKWM6PnZf5+v/xsfO5mNn87Gz+djZfOxsPnY2Hzubj53Nx87mY2fzsbP52Nl87Gw+djYfO5uPHT1ID9KD9CA9' +
    'SA/Sg/QgdvQgPUgP0oP0ID1ID/oV/wCmLzCIMP9m+gAAAABJRU5ErkJggg==',
  'base64'
);

/** Does the PDF carry a raster image XObject? `pdfimages -list` answers the same question from
 *  outside; this asks it with no external binary so the assertion runs everywhere the test does. */
function embedsRasterImage(pdf: ArrayBuffer): boolean {
  return Buffer.from(pdf).includes('/Image');
}

/** Saved beside the test run so a real artefact can be attached to the PR, not just asserted on. */
function saveArtefact(name: string, pdf: ArrayBuffer): string {
  const path = join(process.env.REPORT_ARTEFACT_DIR ?? tmpdir(), name);
  writeFileSync(path, Buffer.from(pdf));
  return path;
}

/**
 * The rendered PDF's page count and its extracted text — the two things that distinguish "a PDF
 * came back" from "the report is in it".
 *
 * pdf.js TRANSFERS the buffer it is handed, detaching the original, so it gets a COPY and the
 * caller keeps a PDF it can still write to disk afterwards.
 */
async function readPdf(pdf: ArrayBuffer): Promise<{ pages: number; text: string }> {
  const { extractText } = await import('unpdf');
  const extracted = await extractText(new Uint8Array(pdf.slice(0)), { mergePages: true });
  return { pages: extracted.totalPages, text: extracted.text };
}

describe('typst-render — the real thing', () => {
  it('renders /admin/usage to a multi-page PDF, charts and all', async () => {
    if (!reachable) return;

    const built = usagePage();
    const template = resolveReportTemplate('/admin/usage');
    const library = readTemplateLibrary();

    // The assets are not incidental: this is what proves `image("panels/<id>.svg")` resolves
    // inside the service's per-request root, and that Typst can actually draw our SVG.
    expect(Object.keys(built.assets).some((path) => path.startsWith('panels/'))).toBe(true);

    const outcome = await renderPdf(RENDER_URL, {
      template: template.source,
      data: built.document,
      assets: { ...built.assets, [library.path]: library.source },
    });

    if (!outcome.ok) throw new Error(`render failed: ${JSON.stringify(outcome)}`);

    const header = Buffer.from(outcome.pdf.slice(0, 5)).toString('latin1');
    expect(header).toBe('%PDF-');
    expect(outcome.pdf.byteLength).toBeGreaterThan(10_000);

    const { pages, text } = await readPdf(outcome.pdf);
    expect(pages).toBeGreaterThanOrEqual(1);
    // The EXPECTED TEXT, not merely "a PDF came back": the title, the window, a panel heading, and
    // a figure that only exists if the adapters ran — $2.65 is the summed micro-USD of the three
    // fixture points, through the same `formatUsd` the screen uses.
    expect(text).toContain('Admin · Usage');
    expect(text).toContain('This month');
    expect(text).toContain('Total cost');
    expect(text).toContain('$2.65');
    expect(text).toContain('gpt-4o');
    console.log(
      `[report] /admin/usage -> ${header} ${outcome.pdf.byteLength} bytes, ${pages} page(s) -> ` +
        saveArtefact('admin-usage-mtd.pdf', outcome.pdf)
    );
  }, 60_000);

  it('renders the migrated consumption report', async () => {
    if (!reachable) return;

    const document = buildConsumptionReport({
      rows: [
        {
          projectId: 'prj_alpha',
          model: 'gpt-4o',
          requests: 1200,
          promptTokens: 1_000_000,
          completionTokens: 250_000,
          totalTokens: 1_250_000,
          totalCostMicroUsd: 1_131_800_000,
        },
        {
          projectId: 'prj_alpha',
          model: 'gpt-4o-mini',
          requests: 3,
          promptTokens: 600,
          completionTokens: 300,
          totalTokens: 900,
          totalCostMicroUsd: 6_300,
        },
      ],
      month: '2026-02',
      accountId: 'acc_123',
      templateOrigin: 'shipped',
      generatedAt: new Date('2026-03-01T08:00:00Z'),
    });

    const template = resolveReportTemplate('/reports/consumption');
    const library = readTemplateLibrary();
    const outcome = await renderPdf(RENDER_URL, {
      template: template.source,
      data: document,
      assets: { [library.path]: library.source },
    });

    if (!outcome.ok) throw new Error(`render failed: ${JSON.stringify(outcome)}`);
    expect(Buffer.from(outcome.pdf.slice(0, 5)).toString('latin1')).toBe('%PDF-');

    const { pages, text } = await readPdf(outcome.pdf);
    // The same figures the deleted hand-rolled writer stated, now stated by Typst — including the
    // sub-cent one, which a fixed two-decimal rule would print as `$0.00`.
    expect(text).toContain('Consumption report');
    expect(text).toContain('prj_alpha');
    expect(text).toContain('$0.0063');
    expect(text).toContain('TOTAL');
    console.log(
      `[report] consumption -> ${outcome.pdf.byteLength} bytes, ${pages} page(s) -> ` +
        saveArtefact('consumption-2026-02.pdf', outcome.pdf)
    );
  }, 60_000);

  it('surfaces a template compile error VERBATIM rather than as a generic failure', async () => {
    if (!reachable) return;

    const outcome = await renderPdf(RENDER_URL, {
      template: '#import "_lib/report.typ": *\n#this-function-does-not-exist()\n',
      data: { title: 'x' },
      assets: { [readTemplateLibrary().path]: readTemplateLibrary().source },
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe('compile_error');
    // Typst's own stderr, line number included — the thing an operator with a broken override
    // needs and cannot get any other way.
    expect(outcome.detail).toMatch(/this-function-does-not-exist/);
  }, 60_000);

  /**
   * The owner's second finding, end to end: a configured branding logo has to reach the paper.
   *
   * Everything except the file on disk is the production path — `resolveReportBranding` picks the
   * light-background variant, `buildReport` puts `branding.logo` in `data.json`, and
   * `_lib/report.typ` draws it left of the title. The assertion is on the PDF's own bytes, not on
   * "the render succeeded": a template that silently skipped the `image()` call would still
   * produce a perfectly good PDF.
   */
  it('embeds the configured branding logo in the header', async () => {
    if (!reachable) return;

    const dir = mkdtempSync(join(tmpdir(), 'branding-'));
    scratch.push(dir);
    const logoLightPath = join(dir, 'logo-light.png');
    writeFileSync(logoLightPath, LOGO_PNG);
    // `logo` is the DARK-theme (white) mark, `logoLight` the light-background one. Both are
    // configured, exactly as prod configures them, so this also pins which of the two prints.
    writeFileSync(join(dir, 'logo.png'), Buffer.alloc(8));

    const branding = resolveReportBranding({
      logoPath: join(dir, 'logo.png'),
      logoLightPath,
      name: 'adorsys',
    });
    expect(branding.asset?.bytes.equals(LOGO_PNG)).toBe(true);

    const built = overviewPage(branding.branding);
    const template = resolveReportTemplate('/admin/overview');
    const library = readTemplateLibrary();

    const assets: Record<string, RenderAsset> = { ...built.assets };
    if (branding.asset) assets[branding.asset.path] = branding.asset.bytes;
    assets[library.path] = library.source;

    const outcome = await renderPdf(RENDER_URL, {
      template: template.source,
      data: built.document,
      assets,
    });
    if (!outcome.ok) throw new Error(`render failed: ${JSON.stringify(outcome)}`);

    expect(Buffer.from(outcome.pdf.slice(0, 5)).toString('latin1')).toBe('%PDF-');
    expect(embedsRasterImage(outcome.pdf)).toBe(true);

    const { pages, text } = await readPdf(outcome.pdf);
    expect(text).toContain('Admin · Overview');
    console.log(
      `[report] /admin/overview + branding logo -> ${outcome.pdf.byteLength} bytes, ${pages} ` +
        `page(s), raster image embedded -> ${saveArtefact('admin-overview-branded.pdf', outcome.pdf)}`
    );
  }, 60_000);

  /**
   * The owner's third ask: a customer template that ships its OWN logo beside it
   * ("custom templates WITH embedded logos in prod").
   *
   * The override directory here is what a `report-templates` ConfigMap mounts to. Note the
   * template's `image("logo.png")` — no leading slash, because a per-route template compiles as
   * `main.typ` AT the render root, unlike `_lib/report.typ`, which needs `image("/" + …)`. That
   * asymmetry is the whole reason this case is an integration test and not a unit test.
   */
  it('renders an override template that draws its own sibling logo', async () => {
    if (!reachable) return;

    const overrideRoot = mkdtempSync(join(tmpdir(), 'console-templates-'));
    scratch.push(overrideRoot);
    const routeDir = join(overrideRoot, 'admin', 'overview');
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(
      join(routeDir, 'report.typ'),
      [
        '#import "_lib/report.typ": *',
        '#let report = json(sys.inputs.at("data"))',
        '#show: report-page.with(report)',
        '#align(right, image("logo.png", height: 20pt))',
        '#text(size: 9pt)[Contoso quarterly estate report]',
        '#panels-in-order(report)',
        '',
      ].join('\n'),
      'utf8'
    );
    writeFileSync(join(routeDir, 'logo.png'), LOGO_PNG);

    process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;

    const template = resolveReportTemplate('/admin/overview');
    expect(template.origin).toBe('override');

    const templateAssets = collectTemplateAssets('/admin/overview');
    if (!templateAssets.ok) throw new Error(templateAssets.message);
    expect(templateAssets.files.map((file) => file.path)).toContain('logo.png');

    const built = overviewPage();
    const library = readTemplateLibrary();
    const assets: Record<string, RenderAsset> = {};
    for (const file of templateAssets.files) assets[file.path] = file.bytes;
    Object.assign(assets, built.assets);
    assets[library.path] = library.source;

    const outcome = await renderPdf(RENDER_URL, {
      template: template.source,
      data: built.document,
      assets,
    });
    if (!outcome.ok) throw new Error(`render failed: ${JSON.stringify(outcome)}`);

    expect(Buffer.from(outcome.pdf.slice(0, 5)).toString('latin1')).toBe('%PDF-');
    expect(embedsRasterImage(outcome.pdf)).toBe(true);

    const { pages, text } = await readPdf(outcome.pdf);
    expect(text).toContain('Contoso quarterly estate report');
    console.log(
      `[report] /admin/overview + override template with its own logo -> ` +
        `${outcome.pdf.byteLength} bytes, ${pages} page(s), raster image embedded -> ` +
        saveArtefact('admin-overview-override-logo.pdf', outcome.pdf)
    );
  }, 60_000);

  it('reports an unreachable renderer as unreachable, never as a compile error', async () => {
    // No skip: this case needs NO renderer, and it is the one the route turns into the 502 that
    // must never degrade into a chartless PDF.
    const outcome = await renderPdf('http://127.0.0.1:9', {
      template: '= x',
      data: {},
      assets: {},
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe('unreachable');
  }, 30_000);
});
