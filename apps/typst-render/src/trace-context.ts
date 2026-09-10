/**
 * W3C Trace Context (`traceparent`) parsing — a ~40-line reader, and deliberately NOT an
 * OpenTelemetry SDK.
 *
 * ## Why this service is not instrumented like its siblings
 *
 * `apps/console` and `apps/lci` both run `@lightbridge/otel`, export real spans, and are named in
 * Tempo. This one does not, and the reason is a contract stated in three places already — this
 * package's own `package.json` (no `dependencies` key at all), `src/server.ts`'s header ("No
 * framework on purpose … the runtime image ships `dist/` with no `node_modules`"), and the
 * Dockerfile, which goes as far as DELETING npm and npx from the base image to shrink the CVE
 * surface of a container that executes attacker-adjacent document programs.
 *
 * `@opentelemetry/sdk-node` and its exporter pull in roughly forty packages. Shipping them here
 * means reintroducing `node_modules` to that image, re-expanding exactly the surface the Dockerfile
 * was written to shrink, and turning a `COPY dist/` into a dependency-install step. That is not a
 * cheap bonus; it is a different design for this service, and it is not made here in passing.
 *
 * ## What is done instead, and what it is genuinely worth
 *
 * The console's `POST /render` already carries a `traceparent` — `@opentelemetry/instrumentation-
 * undici` injects it into every outbound `fetch`, and the console's own CLIENT span for this call
 * is in Tempo regardless of what this process does. What was missing is the OTHER direction: an
 * operator holding a trace id had no way to find this renderer's log lines for that same request.
 *
 * So the trace id is parsed off the header and printed with each render. That is log correlation,
 * not tracing: there is no span for the `typst compile` itself, and the console's client span
 * remains a leaf in the trace. Named honestly rather than sold as instrumentation.
 */

/** The parts of a `traceparent` worth keeping. `parentId` is the console's own span id — the
 *  span this render sits under — which is what makes a log line pinpointable rather than merely
 *  trace-scoped. */
export interface TraceContext {
  readonly traceId: string;
  readonly parentId: string;
  readonly sampled: boolean;
}

const TRACEPARENT = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/** All-zero ids are the specification's explicit "invalid" sentinel, not merely unlikely. */
const ZERO_TRACE_ID = '0'.repeat(32);
const ZERO_SPAN_ID = '0'.repeat(16);

/**
 * Parses a `traceparent` header value, or returns `undefined` for anything that is not a valid
 * version-00 one.
 *
 * Header values arrive from the network and are never trusted: a malformed, absent or hostile
 * value must degrade to "no correlation id in the log line", never to a thrown error inside a
 * request handler. The regex is anchored and hex-only, so nothing that reaches the log can carry
 * an injected newline or control character.
 *
 * Version `ff` is invalid per the spec; any other future version is accepted for its first four
 * fields, which is exactly what the spec's forward-compatibility rule asks of a reader.
 */
export function parseTraceparent(header: string | string[] | undefined): TraceContext | undefined {
  if (typeof header !== 'string') return undefined;
  const match = TRACEPARENT.exec(header.trim());
  if (match === null) return undefined;

  // Every group is present whenever the anchored pattern matched, but this package compiles under
  // `noUncheckedIndexedAccess`, so the four are read defensively rather than asserted away.
  const [version, traceId, parentId, flags] = match.slice(1);
  if (
    version === undefined ||
    traceId === undefined ||
    parentId === undefined ||
    flags === undefined
  )
    return undefined;
  if (version === 'ff') return undefined;
  if (traceId === ZERO_TRACE_ID || parentId === ZERO_SPAN_ID) return undefined;

  return { traceId, parentId, sampled: (Number.parseInt(flags, 16) & 0x01) === 0x01 };
}

/** The trailing `trace=… span=…` fragment of a render's log line, or an empty string when the
 *  caller sent no usable context (a `curl` by hand, a probe, a console built before this landed). */
export function traceLogSuffix(context: TraceContext | undefined): string {
  if (context === undefined) return '';
  return ` trace=${context.traceId} span=${context.parentId}`;
}
