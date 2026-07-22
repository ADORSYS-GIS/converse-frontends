import { type AuthzRpcClientConfig, configureAuthzRpcClient } from './transport';

/**
 * Configures the shared RPC client. Call on every render (cheap — just updates a module-level
 * config object) so a fresh `auth`/`refreshAuth` closure is always in effect, mirroring the
 * previous `useClientInit` pattern from `@lightbridge/api-rest`.
 */
export function useAuthzRpcClient(config: AuthzRpcClientConfig): void {
  configureAuthzRpcClient(config);
}
