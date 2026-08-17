import { LightbridgeAuthzRpcClient } from '../generated/src/client';
import { AuthzRpcRuntime, type AuthzRpcRuntimeOptions } from './runtime';

export type AuthzRpcClientConfig = AuthzRpcRuntimeOptions & {
  baseURL: string;
};

/**
 * Builds one `useXRpcClient`/`getXRpcClient` pair, each backed by its own module-scope singleton
 * client/runtime. `useAuthzRpcClient`/`getAuthzRpcClient` (the `authz-api` CRUD client) and
 * `useBudgetRpcClient`/`getBudgetRpcClient` (the `authz-budget` client — see that file's own doc
 * comment for why budget procedures need a separate client instance) are two independent
 * instances of this factory, not two copies of hand-duplicated logic. Same generated
 * `LightbridgeAuthzRpcClient` type both times -- per `docs/architecture/budget.md` in
 * `lightbridge-authz`, `authz-budget` reuses the SAME generated schema/client as `authz-api`,
 * just mounted at a different origin/basePath, so no second generated package is needed.
 */
function createRpcClientHook(notConfiguredMessage: string) {
  let client: LightbridgeAuthzRpcClient | null = null;
  let runtime: AuthzRpcRuntime | null = null;

  /**
   * Configures the shared RPC client, constructing it on first call and reconfiguring the runtime
   * (fresh `auth`/`refreshAuth` closures) on every subsequent call — cheap, so safe to call on
   * every render. Mirrors the previous `useClientInit` pattern from `@lightbridge/api-rest`.
   */
  function useRpcClient(config: AuthzRpcClientConfig): LightbridgeAuthzRpcClient {
    const { baseURL, ...runtimeOptions } = config;
    if (!runtime || !client) {
      runtime = new AuthzRpcRuntime(baseURL, runtimeOptions);
      client = new LightbridgeAuthzRpcClient(runtime.runtime);
    } else {
      runtime.configure(runtimeOptions);
    }
    return client;
  }

  /** Reads the shared client outside a render — throws if the matching `useXRpcClient` hasn't run yet. */
  function getRpcClient(): LightbridgeAuthzRpcClient {
    if (!client) {
      throw new Error(notConfiguredMessage);
    }
    return client;
  }

  return { useRpcClient, getRpcClient };
}

const authzHook = createRpcClientHook(
  'AuthzRpcClient is not configured. Call useAuthzRpcClient() in the app root first.'
);

export const useAuthzRpcClient = authzHook.useRpcClient;
export const getAuthzRpcClient = authzHook.getRpcClient;

const budgetHook = createRpcClientHook(
  'BudgetRpcClient is not configured. Call useBudgetRpcClient() in the app root first.'
);

/**
 * The `authz-budget` client. Every `budget:*`-gated procedure (see `is_budget_op_id` in
 * `lightbridge-authz`'s `rpc_authorize.rs` for the authoritative 14-procedure list) moved off
 * `authz-api` onto this separate microservice as a hard cutover — calling one of those op-ids
 * through `getAuthzRpcClient()` now 404s. Configure with `basePath: '/budget'` (fixed — not the
 * configurable `rpc_base_path` the CRUD client uses) and `authz-budget`'s own base URL.
 */
export const useBudgetRpcClient = budgetHook.useRpcClient;
export const getBudgetRpcClient = budgetHook.getRpcClient;
