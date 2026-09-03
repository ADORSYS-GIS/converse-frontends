/**
 * Everything about "should this process export traces, and as what" — resolved from the
 * environment ALONE, with no OpenTelemetry import anywhere in this file.
 *
 * The separation is the point. `start.ts` cannot be unit-tested without loading the whole Node SDK
 * (which installs global diagnostics hooks and cannot be un-installed inside a test process), so
 * the decisions worth testing are made here, in a pure function over a plain
 * `Record<string, string | undefined>`. `resolveTelemetryConfig` returning `null` is not an error
 * path — it is the ordinary state of every `next dev` server and every CI build, and the tests
 * assert exactly that.
 *
 * ## The env is the switch — there is no application-level toggle
 *
 * There is deliberately no `OTEL_ENABLED`, no `telemetry.enabled` config field and no chart flag
 * that turns instrumentation on while leaving the endpoint blank. A deployment that has set
 * `OTEL_EXPORTER_OTLP_ENDPOINT` wants traces; one that has not, does not. Any second switch would
 * be a way to ship the code disabled, which is precisely the shape this estate does not want.
 */

import { resolveImageStamp } from './image-stamp';

/** The OTLP wire format this package implements. */
export const SUPPORTED_PROTOCOL = 'http/protobuf';

/** Ratio used when `OTEL_TRACES_SAMPLER_ARG` is unset or unparseable — every root span is kept.
 *
 *  1.0 rather than a fraction because these are low-volume, human-driven server apps: a console
 *  page load and a report export are events an operator wants to find by trace id, not a sampled
 *  population to reason about statistically. A busy deployment lowers it through the standard
 *  variable without a redeploy of anything but its values file. */
export const DEFAULT_SAMPLER_RATIO = 1;

/** `service.namespace` for every app in this estate. A constant, not a knob: it is what makes
 *  `converse-console` and `converse-lci` group together next to the Rust backends in Tempo. */
export const SERVICE_NAMESPACE = 'converse';

export interface TelemetryIdentity {
  /**
   * Compiled-in default for `service.name`, e.g. `converse-console`. `OTEL_SERVICE_NAME`
   * overrides it, which is how the OTLP spec says a service names itself and how an operator
   * renames one deployment's instance without rebuilding the image.
   */
  readonly serviceName: string;
}

export interface TelemetryConfig {
  /** OTLP/HTTP base or signal endpoint, exactly as the exporter should receive it. */
  readonly endpoint: string;
  /** True when `endpoint` is a signal-specific URL (already ends in the traces path), so the
   *  exporter must NOT append `v1/traces` to it. */
  readonly endpointIsSignalSpecific: boolean;
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly serviceNamespace: string;
  readonly deploymentEnvironment?: string;
  readonly samplerRatio: number;
}

/**
 * Why a process refused to start the SDK. Every value is reported as one log line, because the
 * only thing worse than a deployment with no traces is a deployment with no traces and no reason.
 */
export type TelemetryDisabledReason =
  | { readonly kind: 'no-endpoint' }
  | { readonly kind: 'unsupported-protocol'; readonly protocol: string };

export type TelemetryResolution =
  | { readonly enabled: true; readonly config: TelemetryConfig }
  | { readonly enabled: false; readonly reason: TelemetryDisabledReason };

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result === undefined || result === '' ? undefined : result;
}

/**
 * `OTEL_TRACES_SAMPLER_ARG`, clamped to `[0, 1]`.
 *
 * A malformed value falls back to the default rather than throwing: sampling is a dial, and a
 * process that refuses to boot because someone typed `OTEL_TRACES_SAMPLER_ARG=0,5` has turned a
 * telemetry misconfiguration into an outage. A value of exactly `0` is honoured — "record nothing"
 * is a legitimate answer, distinct from "unset".
 */
export function resolveSamplerRatio(raw: string | undefined): number {
  const value = trimmed(raw);
  if (value === undefined) return DEFAULT_SAMPLER_RATIO;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLER_RATIO;
  return Math.min(1, Math.max(0, parsed));
}

/**
 * `service.version`, from the same environment `apps/console/src/server/build-info.ts` reads for
 * `/settings/info`'s Platform card (converse-frontends#476) — deliberately the same pair, so the
 * version a trace is tagged with and the version the diagnostics screen prints can never disagree.
 *
 * The image TAG first — `sha-5fed3ad`, the immutable tag argocd-image-updater promotes against.
 * Deliberately the tag and not the full reference: #477 stamped
 * `ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad` here, and a 60-character registry
 * path is not something anyone can group a Tempo query by. `resolveImageStamp` is what draws that
 * line, and it draws it once for both this and `/settings/info`.
 *
 * `NEXT_PUBLIC_BUILD_SHA` (inlined at `next build` time) is the fallback, shortened the same way
 * the card shortens it.
 *
 * Neither exists on a developer machine, and the answer there is `undefined` — NOT `"0.0.0"` (the
 * literal in every app's package.json, which names nothing) and not `"unknown"`. An absent
 * attribute is omitted from the resource entirely; a placeholder would be a value someone could
 * search Tempo for and find a pile of unrelated dev spans behind.
 */
export function resolveServiceVersion(env: Record<string, string | undefined>): string | undefined {
  const { tag } = resolveImageStamp(env);
  if (tag) return tag;
  const buildSha = trimmed(env.NEXT_PUBLIC_BUILD_SHA);
  if (buildSha) return buildSha.slice(0, 7);
  return undefined;
}

/**
 * The whole decision, in one pure function.
 *
 * Endpoint precedence follows the OTLP specification: the signal-specific
 * `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` (a complete URL, traces path included) wins over the shared
 * `OTEL_EXPORTER_OTLP_ENDPOINT` (a base URL the exporter appends `v1/traces` to). Both are
 * supported because this estate genuinely uses the per-signal form elsewhere — see ai-helm's
 * `librechat-opencode-wellknown` fix, where one process's shared endpoint was being inherited by a
 * sibling that needed a different one.
 *
 * `OTEL_EXPORTER_OTLP_PROTOCOL` is VALIDATED, not merely read. This package exports over OTLP/HTTP
 * with protobuf bodies and nothing else; an operator who wrote `grpc` (:4317) or `http/json` has
 * asked for a wire format the exporter will not produce, and sending protobuf anyway would be a
 * silent lie that surfaces later as an empty Tempo. Refusing, loudly, is the honest failure.
 */
export function resolveTelemetryConfig(
  identity: TelemetryIdentity,
  env: Record<string, string | undefined> = process.env
): TelemetryResolution {
  const signalEndpoint = trimmed(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  const sharedEndpoint = trimmed(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const endpoint = signalEndpoint ?? sharedEndpoint;
  if (endpoint === undefined) {
    return { enabled: false, reason: { kind: 'no-endpoint' } };
  }

  const protocol = trimmed(
    env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL ?? env.OTEL_EXPORTER_OTLP_PROTOCOL
  );
  if (protocol !== undefined && protocol !== SUPPORTED_PROTOCOL) {
    return { enabled: false, reason: { kind: 'unsupported-protocol', protocol } };
  }

  return {
    enabled: true,
    config: {
      endpoint,
      endpointIsSignalSpecific: signalEndpoint !== undefined,
      serviceName: trimmed(env.OTEL_SERVICE_NAME) ?? identity.serviceName,
      serviceVersion: resolveServiceVersion(env),
      serviceNamespace: SERVICE_NAMESPACE,
      // `DEPLOYMENT_ENVIRONMENT` is the plain alias a values file is likeliest to set; the
      // `OTEL_`-prefixed spelling wins when both are present, because it is the one an OTel-aware
      // operator would reach for first.
      deploymentEnvironment:
        trimmed(env.OTEL_DEPLOYMENT_ENVIRONMENT) ?? trimmed(env.DEPLOYMENT_ENVIRONMENT),
      samplerRatio: resolveSamplerRatio(env.OTEL_TRACES_SAMPLER_ARG),
    },
  };
}

/** The single line a process logs when it is NOT exporting. One line, always, never silence —
 *  "did I forget to configure this?" must be answerable from `kubectl logs`. */
export function disabledMessage(serviceName: string, reason: TelemetryDisabledReason): string {
  switch (reason.kind) {
    case 'no-endpoint':
      return `[otel] ${serviceName}: OTEL_EXPORTER_OTLP_ENDPOINT is not set — tracing is off.`;
    case 'unsupported-protocol':
      return (
        `[otel] ${serviceName}: OTEL_EXPORTER_OTLP_PROTOCOL=${reason.protocol} is not supported ` +
        `(this build exports ${SUPPORTED_PROTOCOL} over OTLP/HTTP only) — tracing is off.`
      );
  }
}
