import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SAMPLER_RATIO,
  disabledMessage,
  resolveSamplerRatio,
  resolveServiceVersion,
  resolveTelemetryConfig,
  SERVICE_NAMESPACE,
  type TelemetryIdentity,
} from './config';

const CONSOLE: TelemetryIdentity = { serviceName: 'converse-console' };

/** The minimum an operator has to set for tracing to happen at all. */
const ENDPOINT_ONLY = {
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy.observability.svc.cluster.local:4318',
};

describe('resolveTelemetryConfig', () => {
  it('is off, with a reason, when no endpoint is configured', () => {
    const resolution = resolveTelemetryConfig(CONSOLE, {});
    expect(resolution.enabled).toBe(false);
    if (resolution.enabled) throw new Error('unreachable');
    expect(resolution.reason).toEqual({ kind: 'no-endpoint' });
  });

  it('treats a blank endpoint as unset, not as an empty URL', () => {
    // A Helm values file that renders `OTEL_EXPORTER_OTLP_ENDPOINT: ""` must not produce an
    // exporter pointed at `/v1/traces` on nothing.
    const resolution = resolveTelemetryConfig(CONSOLE, { OTEL_EXPORTER_OTLP_ENDPOINT: '   ' });
    expect(resolution.enabled).toBe(false);
  });

  it('is on as soon as the shared endpoint is set, with the compiled-in service name', () => {
    const resolution = resolveTelemetryConfig(CONSOLE, ENDPOINT_ONLY);
    expect(resolution.enabled).toBe(true);
    if (!resolution.enabled) throw new Error('unreachable');
    expect(resolution.config).toEqual({
      endpoint: 'http://alloy.observability.svc.cluster.local:4318',
      endpointIsSignalSpecific: false,
      serviceName: 'converse-console',
      serviceVersion: undefined,
      serviceNamespace: SERVICE_NAMESPACE,
      deploymentEnvironment: undefined,
      samplerRatio: DEFAULT_SAMPLER_RATIO,
    });
  });

  it('lets OTEL_SERVICE_NAME override the compiled-in default', () => {
    const resolution = resolveTelemetryConfig(CONSOLE, {
      ...ENDPOINT_ONLY,
      OTEL_SERVICE_NAME: 'converse-console-canary',
    });
    if (!resolution.enabled) throw new Error('unreachable');
    expect(resolution.config.serviceName).toBe('converse-console-canary');
  });

  it('prefers the signal-specific endpoint and flags it as already complete', () => {
    const resolution = resolveTelemetryConfig(CONSOLE, {
      ...ENDPOINT_ONLY,
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://alloy.observability.svc:4318/v1/traces',
    });
    if (!resolution.enabled) throw new Error('unreachable');
    expect(resolution.config.endpoint).toBe('http://alloy.observability.svc:4318/v1/traces');
    expect(resolution.config.endpointIsSignalSpecific).toBe(true);
  });

  it('accepts http/protobuf and refuses any other protocol rather than lying about the wire', () => {
    const ok = resolveTelemetryConfig(CONSOLE, {
      ...ENDPOINT_ONLY,
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    });
    expect(ok.enabled).toBe(true);

    for (const protocol of ['grpc', 'http/json']) {
      const refused = resolveTelemetryConfig(CONSOLE, {
        ...ENDPOINT_ONLY,
        OTEL_EXPORTER_OTLP_PROTOCOL: protocol,
      });
      expect(refused.enabled).toBe(false);
      if (refused.enabled) throw new Error('unreachable');
      expect(refused.reason).toEqual({ kind: 'unsupported-protocol', protocol });
    }
  });

  it('reads deployment.environment from either spelling, OTEL_-prefixed winning', () => {
    const plain = resolveTelemetryConfig(CONSOLE, {
      ...ENDPOINT_ONLY,
      DEPLOYMENT_ENVIRONMENT: 'prod',
    });
    if (!plain.enabled) throw new Error('unreachable');
    expect(plain.config.deploymentEnvironment).toBe('prod');

    const both = resolveTelemetryConfig(CONSOLE, {
      ...ENDPOINT_ONLY,
      DEPLOYMENT_ENVIRONMENT: 'prod',
      OTEL_DEPLOYMENT_ENVIRONMENT: 'staging',
    });
    if (!both.enabled) throw new Error('unreachable');
    expect(both.config.deploymentEnvironment).toBe('staging');
  });
});

describe('resolveServiceVersion', () => {
  it('prefers the image tag the pipeline stamped', () => {
    expect(
      resolveServiceVersion({ IMAGE_TAG: 'sha-fbb937f', NEXT_PUBLIC_BUILD_SHA: 'a'.repeat(40) })
    ).toBe('sha-fbb937f');
  });

  it('falls back to the short build SHA, and to nothing at all off a build pipeline', () => {
    expect(resolveServiceVersion({ NEXT_PUBLIC_BUILD_SHA: 'abcdef1234567890' })).toBe('abcdef1');
    expect(resolveServiceVersion({})).toBeUndefined();
  });
});

describe('resolveSamplerRatio', () => {
  it('defaults to keeping every root trace', () => {
    expect(resolveSamplerRatio(undefined)).toBe(1);
    expect(resolveSamplerRatio('')).toBe(1);
  });

  it('honours a real ratio, including zero', () => {
    expect(resolveSamplerRatio('0.1')).toBe(0.1);
    expect(resolveSamplerRatio('0')).toBe(0);
  });

  it('clamps out-of-range values and ignores garbage instead of throwing', () => {
    // A telemetry dial must never be able to take the process down.
    expect(resolveSamplerRatio('7')).toBe(1);
    expect(resolveSamplerRatio('-1')).toBe(0);
    expect(resolveSamplerRatio('0,5')).toBe(1);
  });
});

describe('disabledMessage', () => {
  it('names the service and the reason on one line', () => {
    expect(disabledMessage('converse-lci', { kind: 'no-endpoint' })).toContain(
      'OTEL_EXPORTER_OTLP_ENDPOINT is not set'
    );
    expect(
      disabledMessage('converse-lci', { kind: 'unsupported-protocol', protocol: 'grpc' })
    ).toContain('grpc');
  });
});
