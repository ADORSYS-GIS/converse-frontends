/**
 * `@lightbridge/otel` — the OpenTelemetry wiring shared by every Node-runtime app in this repo
 * (`apps/console`, `apps/lci`), so "how a converse app names itself in Tempo" is decided once.
 *
 * TWO ENTRY POINTS, and the split is load-bearing:
 *
 *  - **`@lightbridge/otel`** (this file) is PURE. It answers "should this process export, and as
 *    what" from the environment alone and imports nothing from OpenTelemetry, so it is unit-
 *    testable in an ordinary vitest process and safe to reach from any runtime.
 *  - **`@lightbridge/otel/start`** loads the Node SDK and is therefore NODE-RUNTIME ONLY. An app
 *    reaches it exclusively from an `instrumentation.node.ts` that its `instrumentation.ts`
 *    dynamically imports behind `process.env.NEXT_RUNTIME === 'nodejs'`.
 *
 * Re-exporting `./start` from here would quietly undo that: a single `import` of the package name
 * from an Edge-reachable module would drag `node:http` and the module-patching machinery into the
 * Edge bundle. It is not re-exported, on purpose.
 *
 * NOT `@vercel/otel`: this estate exports to its own in-cluster Alloy collector over plain OTLP,
 * and none of Vercel's platform-specific resource detection or its Edge-runtime path applies here.
 *
 * See `docs/knowledge/observability.md` for the trace path and the two diagrams.
 */

export {
  DEFAULT_SAMPLER_RATIO,
  SERVICE_NAMESPACE,
  SUPPORTED_PROTOCOL,
  disabledMessage,
  resolveSamplerRatio,
  resolveServiceVersion,
  resolveTelemetryConfig,
  type TelemetryConfig,
  type TelemetryDisabledReason,
  type TelemetryIdentity,
  type TelemetryResolution,
} from './config';

export { resolveImageStamp, tagFromImageReference, type ImageStamp } from './image-stamp';
