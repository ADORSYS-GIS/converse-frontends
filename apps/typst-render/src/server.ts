/**
 * The HTTP surface: `POST /render` and `GET /healthz`, on plain `node:http`.
 *
 * No framework on purpose. The service has two routes, one content type in and two out, and no
 * middleware chain worth the dependency — and the runtime image (see Dockerfile) ships `dist/`
 * with no `node_modules` at all, which is only possible because nothing here is imported from npm.
 */
import http from 'node:http';
import type { ServiceConfig } from './config.js';
import { parseRenderRequest } from './render-request.js';
import { checkTypst, renderPdf } from './render.js';
import { parseTraceparent, traceLogSuffix } from './trace-context.js';

/** The JSON error envelope every non-2xx response uses. */
interface ErrorBody {
  readonly error: string;
  readonly detail?: string;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.byteLength),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function sendError(res: http.ServerResponse, status: number, error: string, detail?: string): void {
  const body: ErrorBody = detail === undefined ? { error } : { error, detail };
  sendJson(res, status, body);
}

/**
 * Read the request body, refusing as soon as the cap is crossed rather than after.
 *
 * The distinction matters: buffering a 500 MB body and *then* returning 413 is the denial of
 * service the cap exists to prevent.
 *
 * On overflow the stream is PAUSED rather than destroyed. Destroying it sends an RST that races
 * the 413 the caller still has to read — observed directly: the test client got
 * `UND_ERR_SOCKET: other side closed` instead of the status code. Pausing stops reading, the
 * kernel receive buffer fills, and TCP backpressure stalls the sender without this process
 * buffering another byte; the `Connection: close` on the 413 then closes the socket gracefully
 * once the response has actually gone out.
 */
function readBody(
  req: http.IncomingMessage,
  maxBytes: number
): Promise<{ ok: true; body: Buffer } | { ok: false; tooLarge: boolean; message: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const finish = (value: Awaited<ReturnType<typeof readBody>>): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    req.on('data', (chunk: Buffer) => {
      total += chunk.byteLength;
      if (total > maxBytes) {
        finish({
          ok: false,
          tooLarge: true,
          message: `request body exceeds the ${maxBytes} byte limit`,
        });
        req.pause();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish({ ok: true, body: Buffer.concat(chunks) }));
    req.on('error', (error) => finish({ ok: false, tooLarge: false, message: error.message }));
  });
}

async function handleRender(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ServiceConfig
): Promise<void> {
  // One line per render, carrying the caller's trace id when it sent one — see
  // `trace-context.ts` for why this service correlates logs rather than emitting spans.
  // Captured BEFORE the body is read so a 413 or a malformed payload is logged too: the requests
  // that fail are the ones an operator is holding a trace id to look up.
  const trace = traceLogSuffix(parseTraceparent(req.headers.traceparent));
  const startedAt = Date.now();
  const done = (outcome: string): void => {
    console.log(`[typst-render] render ${outcome} in ${Date.now() - startedAt}ms${trace}`);
  };

  const read = await readBody(req, config.maxRequestBytes);
  if (!read.ok) {
    if (read.tooLarge) {
      // The rest of the upload is never read, so the connection cannot be reused for a keep-alive
      // follow-up request — say so, and let Node close it after the response is flushed.
      res.setHeader('connection', 'close');
      sendError(res, 413, 'payload_too_large', read.message);
      done('payload_too_large');
    } else {
      sendError(res, 400, 'bad_request', read.message);
      done('bad_request');
    }
    return;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(read.body.toString('utf8')) as unknown;
  } catch (error) {
    sendError(res, 400, 'bad_request', error instanceof Error ? error.message : 'invalid JSON');
    done('bad_request');
    return;
  }

  const parsed = parseRenderRequest(raw);
  if (!parsed.ok) {
    sendError(res, 400, 'bad_request', parsed.message);
    done('bad_request');
    return;
  }

  const outcome = await renderPdf(parsed.request, config);
  done(outcome.kind);
  switch (outcome.kind) {
    case 'pdf':
      res.writeHead(200, {
        'content-type': 'application/pdf',
        'content-length': String(outcome.pdf.byteLength),
        'cache-control': 'no-store',
        // The caller streams this straight through to a browser download; naming it here means
        // the console does not have to invent a filename for the error-free path.
        'content-disposition': 'inline; filename="report.pdf"',
      });
      res.end(outcome.pdf);
      return;
    case 'compile-error':
      // 422, not 400: the request was well-formed, the *document* is what Typst rejected. The
      // detail is Typst's own stderr, verbatim, because it names the line and column — swallowing
      // it into a generic message is the failure mode #453 calls out explicitly.
      sendError(res, 422, 'compile_error', outcome.message);
      return;
    case 'output-too-large':
      sendError(res, 413, 'payload_too_large', outcome.message);
      return;
    case 'timeout':
      sendError(res, 500, 'render_timeout', outcome.message);
      return;
  }
}

async function handleHealth(res: http.ServerResponse, config: ServiceConfig): Promise<void> {
  const health = await checkTypst(config);
  sendJson(res, health.healthy ? 200 : 503, {
    status: health.healthy ? 'ok' : 'unhealthy',
    typst: health.detail,
  });
}

export function createRenderServer(config: ServiceConfig): http.Server {
  return http.createServer((req, res) => {
    // Query strings and trailing slashes are normalised away so `/healthz?probe=1` — which is
    // what some probe tooling emits — is not a 404.
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = url.pathname.replace(/\/+$/, '') || '/';

    const run = async (): Promise<void> => {
      if (route === '/healthz' && req.method === 'GET') return handleHealth(res, config);
      if (route === '/render' && req.method === 'POST') return handleRender(req, res, config);
      if (route === '/render' || route === '/healthz') {
        res.setHeader('allow', route === '/render' ? 'POST' : 'GET');
        sendError(res, 405, 'method_not_allowed', `${req.method ?? 'UNKNOWN'} ${route}`);
        return;
      }
      sendError(res, 404, 'not_found', route);
    };

    run().catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      console.error('[typst-render] unhandled failure', error);
      if (!res.headersSent) sendError(res, 500, 'internal_error', detail);
      else res.end();
    });
  });
}
