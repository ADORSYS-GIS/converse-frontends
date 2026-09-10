import { ROOT_CONTEXT, SpanKind, type Attributes } from '@opentelemetry/api';
import { SamplingDecision, type Sampler } from '@opentelemetry/sdk-trace-node';
import { describe, expect, it } from 'vitest';

import { SERVICE_NAMESPACE, type TelemetryConfig } from './config';
import { ProbeFilteringSampler, telemetryResourceAttributes, traceExporterUrl } from './start';

const BASE: TelemetryConfig = {
  endpoint: 'http://alloy.observability.svc.cluster.local:4318',
  endpointIsSignalSpecific: false,
  serviceName: 'converse-console',
  serviceVersion: 'sha-fbb937f',
  serviceNamespace: SERVICE_NAMESPACE,
  deploymentEnvironment: 'prod',
  samplerRatio: 1,
};

describe('traceExporterUrl', () => {
  it('appends the traces path to a shared base endpoint', () => {
    expect(traceExporterUrl(BASE)).toBe(
      'http://alloy.observability.svc.cluster.local:4318/v1/traces'
    );
  });

  it('does not double the slash when the base endpoint has a trailing one', () => {
    expect(traceExporterUrl({ ...BASE, endpoint: 'http://alloy:4318/' })).toBe(
      'http://alloy:4318/v1/traces'
    );
  });

  it('uses a signal-specific endpoint verbatim', () => {
    expect(
      traceExporterUrl({
        ...BASE,
        endpoint: 'http://alloy:4318/v1/traces',
        endpointIsSignalSpecific: true,
      })
    ).toBe('http://alloy:4318/v1/traces');
  });
});

describe('telemetryResourceAttributes', () => {
  it('carries the four attributes a trace is found by', () => {
    expect(telemetryResourceAttributes(BASE)).toEqual({
      'service.name': 'converse-console',
      'service.namespace': 'converse',
      'service.version': 'sha-fbb937f',
      'deployment.environment.name': 'prod',
    });
  });

  it('omits an unknown version or environment rather than inventing one', () => {
    // An absent build stamp is a real state (a `next dev` server). `service.version: "unknown"`
    // would be a value someone could search for and find nothing behind.
    expect(
      telemetryResourceAttributes({
        ...BASE,
        serviceVersion: undefined,
        deploymentEnvironment: undefined,
      })
    ).toEqual({ 'service.name': 'converse-console', 'service.namespace': 'converse' });
  });
});

describe('ProbeFilteringSampler', () => {
  const alwaysOn: Sampler = {
    shouldSample: () => ({ decision: SamplingDecision.RECORD_AND_SAMPLED }),
    toString: () => 'AlwaysOn',
  };
  const sampler = new ProbeFilteringSampler(alwaysOn);
  const sample = (kind: SpanKind, attributes: Attributes): SamplingDecision =>
    sampler.shouldSample(ROOT_CONTEXT, 't', 'span', kind, attributes, []).decision;

  it.each([
    // instrumentation-http's stable semconv name…
    { 'url.path': '/robots.txt' },
    // …and the pre-1.0 names Next.js's own tracer still emits. Both producers make a SERVER span
    // for the SAME probe request, which is why one attribute name is not enough.
    { 'http.target': '/robots.txt' },
    { 'http.route': '/robots.txt' },
    { 'next.route': '/robots.txt' },
    { 'url.path': '/healthz' },
    // Some probe tooling appends a query string.
    { 'url.path': '/healthz?probe=1' },
  ])('drops a probe SERVER span identified by %o', (attributes) => {
    expect(sample(SpanKind.SERVER, attributes)).toBe(SamplingDecision.NOT_RECORD);
  });

  it('keeps a real SERVER span', () => {
    expect(sample(SpanKind.SERVER, { 'url.path': '/admin/usage' })).toBe(
      SamplingDecision.RECORD_AND_SAMPLED
    );
  });

  it('keeps a CLIENT call to a backend probe path', () => {
    // An outbound request to some other service's /healthz is a real call worth seeing; only
    // INBOUND probes are noise.
    expect(sample(SpanKind.CLIENT, { 'url.path': '/healthz' })).toBe(
      SamplingDecision.RECORD_AND_SAMPLED
    );
  });

  it('delegates when there is no path attribute at all', () => {
    expect(sample(SpanKind.INTERNAL, {})).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('names the sampler it wraps, so a diag dump is readable', () => {
    expect(sampler.toString()).toBe('ProbeFiltering(AlwaysOn)');
  });
});
