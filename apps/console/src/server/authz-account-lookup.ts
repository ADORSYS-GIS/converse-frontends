import {
  AuthzRpcRuntime,
  LightbridgeAuthzRpcClient,
  ensureCborCodecReady,
} from '@lightbridge/authz-rpc';

import { serverEnv } from './env';

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

async function authzClient(accessToken: string): Promise<LightbridgeAuthzRpcClient> {
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
