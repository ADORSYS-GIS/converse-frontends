import { LightbridgeAuthzRpcClient } from '../generated/src/client';
import { AuthzRpcRuntime, type AuthzRpcRuntimeOptions } from './runtime';

export type AuthzRpcClientConfig = AuthzRpcRuntimeOptions & {
  baseURL: string;
};

let client: LightbridgeAuthzRpcClient | null = null;
let runtime: AuthzRpcRuntime | null = null;

/**
 * Configures the shared RPC client, constructing it on first call and reconfiguring the runtime
 * (fresh `auth`/`refreshAuth` closures) on every subsequent call — cheap, so safe to call on
 * every render. Mirrors the previous `useClientInit` pattern from `@lightbridge/api-rest`.
 */
export function useAuthzRpcClient(config: AuthzRpcClientConfig): LightbridgeAuthzRpcClient {
  const { baseURL, ...runtimeOptions } = config;
  if (!runtime || !client) {
    runtime = new AuthzRpcRuntime(baseURL, runtimeOptions);
    client = new LightbridgeAuthzRpcClient(runtime);
  } else {
    runtime.configure(runtimeOptions);
  }
  return client;
}

/** Reads the shared client outside a render — throws if `useAuthzRpcClient` hasn't run yet. */
export function getAuthzRpcClient(): LightbridgeAuthzRpcClient {
  if (!client) {
    throw new Error(
      'AuthzRpcClient is not configured. Call useAuthzRpcClient() in the app root first.'
    );
  }
  return client;
}
