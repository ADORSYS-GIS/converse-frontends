/**
 * Next.js calls `register()` exactly once per server instance, before the first request is served
 * (`instrumentation.ts` — a stable file convention since Next 15; this app is on 16.3.2, so there
 * is no `experimental.instrumentationHook` flag to set and none is set).
 *
 * ## Why this file does nothing but branch
 *
 * `register()` runs on BOTH server runtimes. The Node OpenTelemetry SDK cannot exist on the Edge
 * runtime at all — it reaches for `node:http`, `node:diagnostics_channel` and module patching,
 * none of which the Edge runtime implements — so the SDK is loaded through a dynamic `import()`
 * that only the Node branch ever evaluates. A static `import` at the top of this file would be
 * pulled into the Edge bundle by the compiler regardless of the `if`, and the Edge compile would
 * fail.
 *
 * **The Edge runtime is deliberately NOT instrumented.** `src/middleware.ts` is this app's only
 * Edge-resident code; it inspects the session cookie and either passes the request through or
 * redirects it to `/auth/login`, calling nothing and awaiting nothing. Instrumenting it would need
 * `@vercel/otel` (the only SDK with an Edge path) for the sake of a span with no children, on a
 * platform this estate does not deploy to. The trace still begins at the Node server span the
 * request reaches immediately afterwards; nothing is lost but the redirect hop.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  await import('./instrumentation.node');
}
