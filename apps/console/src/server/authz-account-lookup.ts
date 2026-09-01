import { serverEnv } from './env';

/** Lazily imported so a missing/untraceable codec package degrades to the guard's fail-closed
 *  path (403 with a logged reason) instead of killing the whole route MODULE at import — the
 *  exact failure mode of the 2026-08-30 prod incident (bare 500, empty body, nothing logged:
 *  Next never reached a handler). `next.config.mjs`'s `serverExternalPackages` plus
 *  `apps/console/Dockerfile` shipping the codec's store dirs into the image (see both files' own
 *  comments) are the fix for the package actually being *present*; this lazy `import()` boundary
 *  is the separate guarantee that even a still-broken codec degrades this ONE guard check instead
 *  of taking the whole route module down with it. */
async function loadRpc() {
  // The `webpackMode: "eager"` magic comment this line used to carry is gone: it was written for
  // webpack (2026-08-30, second half of the usage outage — a bare dynamic import made webpack
  // SPLIT this package into an async server chunk, and the standalone bundle's chunk resolution
  // failed inside the bracketed route dir, `ERR_UNSUPPORTED_DIR_IMPORT` + "a.replace is not a
  // function" in webpack-runtime), and Turbopack (this app's bundler since the serwist/Turbopack
  // migration) doesn't understand webpack magic comments — it silently ignores them, so the
  // comment was dead weight, not a functioning fix, and removing it changes nothing Turbopack
  // actually does.
  //
  // Turbopack DOES still split this import: the compiled route (`.next/server/app/api/usage/
  // [...path]/route.js`'s chunk graph) shows `@lightbridge/authz-rpc` resolving through a
  // `[externals]_@cratestack_cbor_*` chunk, fetched at call time via Turbopack's own async-import
  // runtime helper (`e.A(...)` / `Context.externalImport`) — a genuinely different mechanism from
  // webpack's, not "the same bug, still there." Verified this doesn't reproduce the 2026-08-30
  // failure mode by forcing the exact failure it would need to survive: with the native CBOR
  // binding deliberately broken (an Alpine/musl container — see the "known gap" note on
  // `next.config.mjs`'s CBOR block — genuinely cannot load `@cratestack/cbor-node`'s glibc-only
  // binding), a real `POST /api/usage/usage/v1/usage/query` against the built image returned a
  // clean `403 {"error":"scope_not_owned"}` with a properly logged cause
  // (`[console] usage-scope-guard: failed to resolve owned accounts: Error: Failed to load
  // external module @cratestack/cbor-...: Cannot find native binding`) — not a bare 500. Turbopack's
  // async-chunk fetch rejects like any other failed `import()`, which is exactly what this
  // function's caller (`authzClient`, called from `resolveOwnedAccountIds` /
  // `resolveProjectAccountId`, both already wrapped in `try`/`catch`) already handles. The dynamic
  // `import()` itself — not any magic comment — is what keeps this catchable; that's unchanged.
  return import('@lightbridge/authz-rpc');
}

/**
 * Server-side (never-browser) `authz-api` RPC calls backing `usage-scope-guard.ts`'s two async
 * resolvers.
 *
 * Deliberately NOT routed through `/api/rpc/*` (`proxy.ts`) — that proxy exists so the BROWSER
 * never holds the backend's URL or a bearer token for it (ADR 0009 Decision 3). This code already
 * runs entirely on the server (`route.ts`'s `runtime = 'nodejs'` export), so it calls `authz-api`
 * directly with the caller's own bearer token — the same shape `app/api/reports/consumption/
 * route.ts` already uses to call the usage backend directly rather than looping back through its
 * own `/api/usage/*` proxy.
 *
 * Reuses the real generated client (`AuthzRpcRuntime` + `LightbridgeAuthzRpcClient`,
 * `@lightbridge/authz-rpc`) rather than a hand-rolled `fetch`: `authz-api` answers a JSON `Accept`
 * with `406 Not Acceptable` and a JSON body with `415` (lightbridge-authz ADR-0013 — CBOR is the
 * only wire codec), and `@cratestack/cbor`'s conditional `exports` map resolves to its Node build
 * (`@cratestack/cbor-node`, native N-API) under this route's `runtime = 'nodejs'`, so the same
 * codec machinery the browser client uses (`packages/authz-rpc/src/codec.ts`) works unchanged
 * here.
 *
 * A fresh runtime per call, not a module-scope singleton: the bearer token is per-request (per
 * signed-in subject), and `AuthzRpcRuntime`'s `auth` closure is captured at construction — sharing
 * one instance across requests would either need `configure()` on every call (racy under
 * concurrent requests on the same server instance) or risk one subject's token leaking into a
 * concurrent request for another. Construction itself performs no network I/O, so this costs one
 * cheap object allocation per guard check, not a connection.
 */

async function authzClient(accessToken: string) {
  const { AuthzRpcRuntime, LightbridgeAuthzRpcClient, ensureCborCodecReady } = await loadRpc();
  await ensureCborCodecReady();
  const env = serverEnv();
  const runtime = new AuthzRpcRuntime(env.backendUrl, {
    basePath: env.apiBasePath,
    auth: async () => accessToken,
  });
  return new LightbridgeAuthzRpcClient(runtime.runtime);
}

/** Page size mirrors `use-console-scope.ts`'s own `SCOPE_PAGE_SIZE` — the same practical ceiling
 *  the workspace switcher already lives with for "every account this identity owns." */
const OWNED_ACCOUNTS_PAGE_SIZE = 100;

/**
 * `model.Account.list`, scoped server-side by the backend's own `@@allow("read", userId ==
 * auth().id)` rule (`containers/account-ownership.ts`'s own doc comment) to accounts the bearer
 * token's subject owns — the identical call `use-console-scope.ts`'s `useList({resource:
 * 'accounts'})` makes from the browser, just direct rather than through refine.
 *
 * `null` on any RPC/network failure — the guard (`usage-scope-guard.ts`'s `guardUsageScope`)
 * treats that identically to "resolved zero accounts," never as "assume everything is owned."
 */
export async function resolveOwnedAccountIds(accessToken: string): Promise<Set<string> | null> {
  try {
    const client = await authzClient(accessToken);
    const page = await client.accounts.list({ limit: OWNED_ACCOUNTS_PAGE_SIZE });
    return new Set(page.items.map((account) => account.id));
  } catch (error) {
    console.error('[console] usage-scope-guard: failed to resolve owned accounts:', error);
    return null;
  }
}

/**
 * `model.Project.get`, returning the project's owning account id. `null` for "not found," "no
 * permission to see it," and a genuine transport failure alike — all three fail closed the same
 * way in `isScopeOwned`.
 */
export async function resolveProjectAccountId(
  accessToken: string,
  projectId: string
): Promise<string | null> {
  try {
    const client = await authzClient(accessToken);
    const project = await client.projects.get(projectId);
    return project.accountId;
  } catch (error) {
    console.error('[console] usage-scope-guard: failed to resolve project account:', error);
    return null;
  }
}
