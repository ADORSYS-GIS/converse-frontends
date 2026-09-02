/**
 * The HTTP client for the `typst-render` sidecar (converse-frontends#453; wire contract in
 * `apps/typst-render/README.md`).
 *
 * ```
 * POST /render  { template: string, data: object, assets: { [path]: base64 } }  ->  application/pdf
 * ```
 *
 * `data` is written by the service as `data.json` at the render root and passed to the compiler as
 * `--input data=data.json`, so **`sys.inputs.data` is a FILENAME, not the payload** — every
 * template starts `#let report = json(sys.inputs.at("data"))`. `assets` are written verbatim at
 * their given relative paths, which is how `image("panels/<id>.svg")` and
 * `#import "_lib/report.typ"` both resolve inside the sandbox.
 *
 * Three failures, three distinct outcomes, because the story names all three as things that must
 * not collapse into a generic 500:
 *
 *  - **unreachable** — no renderer configured, connection refused, DNS, timeout. The caller
 *    answers 502 and the dialog says the renderer is unreachable. It never falls back to a
 *    chartless PDF; a report that silently drops its charts is worse than one that fails.
 *  - **compile_error** — the service's own 422, whose `detail` is Typst's stderr VERBATIM, line
 *    and column included. Passed through untouched and paired with the template's own path, so an
 *    operator who mounted a broken override is told which file and which line.
 *  - **service_error** — anything else the service answered (413 over-size, 500 render timeout).
 *
 * No retry. A compile error is deterministic, and a 30-second compile timeout retried is 60
 * seconds of a request the reader is watching. The dialog's own Retry is the only retry, and it is
 * the reader's decision.
 */

export type TypstRenderOutcome =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; kind: 'unreachable'; detail: string }
  | { ok: false; kind: 'compile_error'; detail: string }
  | { ok: false; kind: 'service_error'; status: number; detail: string };

export interface TypstRenderRequest {
  template: string;
  data: unknown;
  /** Relative path → UTF-8 text (SVGs, the shared `_lib/report.typ`). Encoded to base64 here so a
   *  caller never has to think about the wire format. */
  assets: Record<string, string>;
}

/** How long the console waits on a render before giving up. Deliberately LONGER than the
 *  service's own 30 s compile timeout so a compile that times out is reported by the service as a
 *  render_timeout — an answer naming the cause — rather than being cut off here as an
 *  indistinguishable "unreachable". */
export const TYPST_RENDER_TIMEOUT_MS = 45_000;

function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

export async function renderPdf(
  baseUrl: string,
  request: TypstRenderRequest,
  signal?: AbortSignal
): Promise<TypstRenderOutcome> {
  const body = JSON.stringify({
    template: request.template,
    data: request.data,
    assets: Object.fromEntries(
      Object.entries(request.assets).map(([path, text]) => [path, toBase64(text)])
    ),
  });

  const timeout = AbortSignal.timeout(TYPST_RENDER_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: combined,
      cache: 'no-store',
    });
  } catch (error) {
    return { ok: false, kind: 'unreachable', detail: (error as Error).message };
  }

  if (response.ok) {
    return { ok: true, pdf: await response.arrayBuffer() };
  }

  // The service answers every failure as `{error, detail}` JSON; a body that is not that shape is
  // still surfaced as text rather than swallowed, because whatever it is, it is the only evidence
  // the caller has.
  const raw = await response.text().catch(() => '');
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: string; detail?: string };
    detail = parsed.detail ?? parsed.error ?? raw;
  } catch {
    /* not JSON — keep the raw text */
  }

  if (response.status === 422) {
    return { ok: false, kind: 'compile_error', detail };
  }
  return { ok: false, kind: 'service_error', status: response.status, detail };
}
