import { startTelemetry } from '@lightbridge/otel/start';

/**
 * LCI's OpenTelemetry start-up. Node runtime only — reached solely from `instrumentation.ts`'s
 * `NEXT_RUNTIME === 'nodejs'` branch, via a dynamic import.
 *
 * `converse-lci` is the COMPILED-IN default `service.name`: the name a trace from this image
 * carries when the deployment says nothing. It matches `service.name` as the charts spell it, and
 * `OTEL_SERVICE_NAME` overrides it for a deployment that runs two of these side by side.
 *
 * Everything else — whether to export at all, where to, at what sampling ratio — comes from the
 * standard `OTEL_*` environment. With no `OTEL_EXPORTER_OTLP_ENDPOINT` set (every `next dev`
 * server, every `next build`, every unit test) `startTelemetry` starts nothing and logs one line
 * saying so.
 */
startTelemetry({ serviceName: 'converse-lci' });
