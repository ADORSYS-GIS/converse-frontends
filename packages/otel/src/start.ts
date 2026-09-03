import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  SpanKind,
  type Attributes,
  type Context,
  type Link,
} from '@opentelemetry/api';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ParentBasedSampler,
  SamplingDecision,
  TraceIdRatioBasedSampler,
  type Sampler,
  type SamplingResult,
} from '@opentelemetry/sdk-trace-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import {
  disabledMessage,
  resolveTelemetryConfig,
  type TelemetryConfig,
  type TelemetryIdentity,
} from './config';

/**
 * Starts the Node OpenTelemetry SDK, or explains in one line why it did not.
 *
 * This module is NODE-RUNTIME ONLY and must never be reached from an Edge bundle — `NodeSDK`
 * pulls in `node:http`, `node:diagnostics_channel` and the module-patching machinery, none of
 * which exists on the Edge runtime. Callers enforce that with the `NEXT_RUNTIME === 'nodejs'`
 * guard in their own `instrumentation.ts`, which is why this file is only ever reached through a
 * dynamic `import()`.
 *
 * ## Why these two instrumentations and no others
 *
 * `@opentelemetry/auto-instrumentations-node` would install thirty-odd patches for libraries these
 * apps do not use, and each one is a module hook that runs on every `require`. What these apps
 * actually do is: serve HTTP, and call other services over `fetch`.
 *
 *  - **`instrumentation-http`** covers the `node:http`/`node:https` transport: the socket-level
 *    SERVER span, and CLIENT spans for anything that calls `http.request` directly rather than
 *    going through `fetch`.
 *
 *    Measured caveat, stated because it surprised the change that added this: the transport-level
 *    SERVER span is NOT what makes a page load traceable. Against a real collector, `apps/console`
 *    produced one per request while `apps/lci` — same package, same version, same standalone build
 *    — produced none, and both apps were fully traceable either way, because the span a reader
 *    actually navigates by comes from **Next.js's own tracer** (`next.js` scope, `Kind: Server`,
 *    carrying `http.route`). Next emits that whether or not this instrumentation patched in time,
 *    which is why the probe filter had to move into the sampler (see `ProbeFilteringSampler`).
 *    This instrumentation is kept for the client half and for the transport detail when it is
 *    there — not relied on for the inbound span.
 *  - **`instrumentation-undici`** produces the CLIENT span for every outbound `fetch`, and — the
 *    part that matters most here — INJECTS `traceparent` into it. Node's global `fetch` *is*
 *    undici, so this covers every backend call the apps make without any of them being rewritten:
 *    the authz/budget RPC proxies (`app/api/rpc`, `app/api/budget/rpc`), the usage REST proxy
 *    (`app/api/usage`), `/version` reads for `/settings/info`, LCI's control-plane calls, and the
 *    `POST /render` to the typst-render sidecar. That header is what joins these spans to
 *    lightbridge-authz's, which already emits OTLP.
 *
 * There is no pino instrumentation because neither app uses pino — both log through `console`.
 */

/** Paths whose traces are dropped at the sampler, before any span is recorded.
 *
 *  Both apps point all three kubelet probes (liveness, readiness, startup) at `/robots.txt`, on two
 *  replicas — roughly one trace every two seconds, forever, from a request that runs no application
 *  code. They would outnumber real traffic in Tempo by orders of magnitude and tell nobody anything.
 *  `/healthz`, `/readyz` and `/livez` are here so the list stays true if a probe path is ever added
 *  to a Node app. */
const PROBE_PATHS = new Set(['/robots.txt', '/healthz', '/readyz', '/livez']);

/** Attributes that can carry the request path at span-creation time. Four, not one, because three
 *  producers disagree: `instrumentation-http` sets `url.path` (stable semconv), Next.js's own
 *  tracer sets `http.target` and `http.route` (the pre-1.0 names it still uses), and `next.route`
 *  rides along with them. */
const PATH_ATTRIBUTES = ['url.path', 'http.target', 'http.route', 'next.route'] as const;

function isProbeSpan(attributes: Attributes | undefined): boolean {
  if (attributes === undefined) return false;
  for (const key of PATH_ATTRIBUTES) {
    const value = attributes[key];
    if (typeof value === 'string' && PROBE_PATHS.has(value.split('?')[0] ?? '')) return true;
  }
  return false;
}

/**
 * Drops probe traces, and delegates every other decision.
 *
 * A SAMPLER rather than `HttpInstrumentation`'s `ignoreIncomingRequestHook`, because that hook only
 * suppresses the HTTP-layer span. Verified against a real collector: with the hook in place,
 * `GET /robots.txt` still arrived as a full seven-span trace from **Next.js's own tracer**
 * (`next.span_type: BaseServer.handleRequest` and its children), which knows nothing about that
 * hook. Filtering at the sampler catches both producers, because it is the one place every span in
 * this process goes through.
 *
 * Dropping the SERVER span drops the whole trace with it: the delegate is parent-based, so the
 * render/route spans Next.js creates underneath see a non-sampled parent and are dropped too. No
 * orphans.
 */
export class ProbeFilteringSampler implements Sampler {
  constructor(private readonly delegate: Sampler) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // SERVER spans only. A CLIENT span this app makes to some backend's own `/healthz` is a real
    // outbound call worth seeing, and must not be swept up by a path match.
    if (spanKind === SpanKind.SERVER && isProbeSpan(attributes)) {
      return { decision: SamplingDecision.NOT_RECORD };
    }
    return this.delegate.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `ProbeFiltering(${this.delegate.toString()})`;
  }
}

/** Turns the resolved config into the exact URL the exporter posts to.
 *
 *  The OTLP spec draws this distinction and the exporters honour it: a signal-specific endpoint is
 *  used verbatim, a shared one gets `v1/traces` appended. Getting it wrong is a 404 per export
 *  batch, logged by the collector and nowhere else. */
export function traceExporterUrl(config: TelemetryConfig): string {
  if (config.endpointIsSignalSpecific) return config.endpoint;
  return `${config.endpoint.replace(/\/+$/, '')}/v1/traces`;
}

/** The resource attributes every span from this process carries. Exported so a test can assert
 *  the mapping without starting an SDK. */
export function telemetryResourceAttributes(config: TelemetryConfig): Record<string, string> {
  return {
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_NAMESPACE]: config.serviceNamespace,
    ...(config.serviceVersion ? { [ATTR_SERVICE_VERSION]: config.serviceVersion } : {}),
    ...(config.deploymentEnvironment
      ? { [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.deploymentEnvironment }
      : {}),
  };
}

let started: NodeSDK | undefined;

/**
 * Idempotent: `register()` is called once per server instance, but a dev server that recompiles
 * `instrumentation.ts` can call it again, and two `NodeSDK`s in one process means two global
 * provider registrations and duplicated spans.
 *
 * Returns whether telemetry is now running, so a caller can log its own line if it wants to.
 */
export function startTelemetry(
  identity: TelemetryIdentity,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (started !== undefined) return true;

  const resolution = resolveTelemetryConfig(identity, env);
  if (!resolution.enabled) {
    console.info(disabledMessage(identity.serviceName, resolution.reason));
    return false;
  }
  const { config } = resolution;

  // The SDK's own errors (an unreachable collector, a rejected batch) are otherwise swallowed
  // entirely. ERROR only: INFO logs every export batch, which on a busy console is noise that
  // costs more than it tells.
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes(telemetryResourceAttributes(config)),
    traceExporter: new OTLPTraceExporter({ url: traceExporterUrl(config) }),
    // PARENT-BASED, not a bare ratio sampler: an inbound request that already carries a sampled
    // `traceparent` (from another service, or a browser) must stay in its trace, otherwise a
    // ratio below 1 punches holes in traces rather than removing whole ones. The ratio therefore
    // only decides what happens to a trace this process ROOTS.
    //
    // Wrapped so kubelet probe traces never reach the exporter — see `ProbeFilteringSampler`, and
    // note the probe filter runs BEFORE the parent check on purpose: a probe carries no
    // `traceparent`, so there is no upstream decision to respect.
    sampler: new ProbeFilteringSampler(
      new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(config.samplerRatio) })
    ),
    // W3C `traceparent` + `baggage`, stated explicitly rather than left to the default, because
    // joining lightbridge-authz's traces is the whole reason this package exists and a silent
    // default change would break it without touching this file.
    textMapPropagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
    // No `ignoreIncomingRequestHook` on the HTTP instrumentation: probe filtering lives in the
    // sampler instead, because that hook cannot see Next.js's own spans (see
    // `ProbeFilteringSampler`). One mechanism, in the one place every span passes through.
    instrumentations: [new HttpInstrumentation(), new UndiciInstrumentation()],
    // TRACES ONLY, and these two empty arrays are what makes that true.
    //
    // Left unset, `NodeSDK` derives a metrics pipeline and a logs pipeline from the SAME
    // `OTEL_EXPORTER_OTLP_ENDPOINT` (`sdk.js`: an empty `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER`
    // means "use the default otlp exporter", not "none"). Caught on the first end-to-end run against
    // a traces-only collector, which answered the metrics batches with a 404 the SDK then logged
    // once every export interval, forever:
    //
    //   Error: PeriodicExportingMetricReader: metrics export failed (error OTLPExporterError: Not Found)
    //
    // Neither pipeline would carry anything worth having if it did succeed: Next.js emits no OTel
    // metrics of its own, this estate's metrics come from Prometheus scraping, and its logs are
    // collected from stdout by Alloy. So the readers are set to none EXPLICITLY rather than
    // configured to export into a void.
    metricReaders: [],
    logRecordProcessors: [],
  });

  sdk.start();
  started = sdk;

  // Flush on the way out. Kubernetes sends SIGTERM and gives the pod its grace period; without
  // this the last batch — which usually contains the spans of whatever request was in flight when
  // the rollout started, i.e. the interesting ones — dies in the exporter's queue.
  //
  // `process.exit` is deliberately NOT called here: Next's own server owns the shutdown sequence,
  // and a telemetry hook that kills the process would truncate in-flight responses. These
  // listeners only flush.
  const flush = (): void => {
    void sdk.shutdown().catch((error: unknown) => {
      console.error('[otel] shutdown failed:', error);
    });
  };
  process.once('SIGTERM', flush);
  process.once('SIGINT', flush);

  console.info(
    `[otel] ${config.serviceName} exporting traces to ${traceExporterUrl(config)} ` +
      `(version=${config.serviceVersion ?? 'unknown'}, ` +
      `environment=${config.deploymentEnvironment ?? 'unset'}, sampler=${config.samplerRatio})`
  );
  return true;
}
