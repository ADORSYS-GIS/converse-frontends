import { client } from '../client/client.gen';
import { ClientOptions } from '../client/client';
import { Config as ApiConfig } from '../client/core/types.gen';

export type ClientInitOptions = ClientOptions &
  ApiConfig & {
    refreshAuth?: () => Promise<boolean>;
    getExpiresAt?: () => number | undefined;
    onRefreshFailure?: () => void;
  };

let isInitialized = false;
let latestApiOptions: ClientInitOptions;
let latestUsageOptions: ClientInitOptions;
let refreshPromise: Promise<boolean> | null = null;

/** Timestamp until which refresh attempts should be skipped after a definitive failure. */
let refreshCooldownUntil = 0;
const REFRESH_COOLDOWN_MS = 60 * 1000;

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

function isRefreshInCooldown(): boolean {
  return Date.now() < refreshCooldownUntil;
}

/**
 * Mark refresh as definitively failed (e.g. invalid_grant).
 * Prevents further refresh attempts for REFRESH_COOLDOWN_MS to avoid
 * hammering the IdP with a dead refresh token.
 */
function markRefreshFailed(): void {
  refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
}

/** Reset the cooldown — called after a successful refresh or re-login. */
function resetRefreshCooldown(): void {
  refreshCooldownUntil = 0;
}

async function tryProactiveRefresh(targetConfig: ClientInitOptions): Promise<void> {
  if (!targetConfig.refreshAuth || !targetConfig.getExpiresAt) {
    return;
  }

  if (isRefreshInCooldown()) {
    return;
  }

  const expiresAt = targetConfig.getExpiresAt();
  if (!expiresAt) {
    return;
  }

  const timeUntilExpiry = expiresAt - Date.now();
  if (timeUntilExpiry <= TOKEN_REFRESH_BUFFER_MS) {
    if (refreshPromise === null) {
      refreshPromise = targetConfig.refreshAuth();
      try {
        const success = await refreshPromise;
        if (success) {
          resetRefreshCooldown();
        } else {
          markRefreshFailed();
          if (targetConfig.onRefreshFailure) {
            targetConfig.onRefreshFailure();
          }
        }
      } catch {
        markRefreshFailed();
        if (targetConfig.onRefreshFailure) {
          targetConfig.onRefreshFailure();
        }
      } finally {
        refreshPromise = null;
      }
    } else {
      const success = await refreshPromise;
      if (!success && !isRefreshInCooldown()) {
        // Cooldown may not have been set yet if the first caller hasn't finished
        markRefreshFailed();
      }
    }
  }
}

function isUsageRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('/usage/v1') ||
    url.startsWith('/v1/usage') ||
    url.startsWith('/v1/otel') ||
    url.startsWith('/health')
  );
}

export function useClientInit(apiOptions: ClientInitOptions, usageOptions: ClientInitOptions) {
  latestApiOptions = apiOptions;
  latestUsageOptions = usageOptions;

  if (!isInitialized) {
    const methods = [
      'request',
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'head',
      'options',
      'trace',
    ] as const;

    methods.forEach((method) => {
      const original = (client as any)[method].bind(client);

      (client as any)[method] = async (options: any) => {
        const actualOptions = options;

        const isUsage = isUsageRequest(actualOptions.url);
        const targetConfig = isUsage ? latestUsageOptions : latestApiOptions;
        const baseUrl = targetConfig.baseURL;

        const security = actualOptions.security ?? [{ type: 'http', scheme: 'bearer' }];

        await tryProactiveRefresh(targetConfig);

        try {
          const currentConfig = isUsage ? latestUsageOptions : latestApiOptions;
          return await original({
            ...actualOptions,
            security,
            baseURL: baseUrl,
            auth: currentConfig.auth,
          });
        } catch (error: any) {
          if (error?.status === 401 || error?.response?.status === 401) {
            // If we already know refresh is broken (e.g. invalid_grant), don't retry.
            if (isRefreshInCooldown()) {
              throw error;
            }

            if (refreshPromise === null && targetConfig.refreshAuth) {
              refreshPromise = targetConfig.refreshAuth();
              let success: boolean;
              try {
                success = await refreshPromise;
              } catch {
                // Refresh promise rejected — treat as definitive failure
                markRefreshFailed();
                if (targetConfig.onRefreshFailure) {
                  targetConfig.onRefreshFailure();
                }
                throw error;
              } finally {
                refreshPromise = null;
              }

              if (!success) {
                markRefreshFailed();
                if (targetConfig.onRefreshFailure) {
                  targetConfig.onRefreshFailure();
                }
                throw error;
              }

              resetRefreshCooldown();

              // Refresh succeeded — retry the original request with updated auth.
              // Errors from the retry propagate naturally (not swallowed).
              const latestConfig = isUsage ? latestUsageOptions : latestApiOptions;
              return await original({
                ...actualOptions,
                security,
                baseURL: baseUrl,
                auth: latestConfig.auth,
              });
            } else if (refreshPromise !== null) {
              // Another request is already refreshing — await its result.
              const success = await refreshPromise;
              if (!success) {
                if (!isRefreshInCooldown()) {
                  markRefreshFailed();
                }
                if (targetConfig.onRefreshFailure) {
                  targetConfig.onRefreshFailure();
                }
                throw error;
              }
              const latestConfig = isUsage ? latestUsageOptions : latestApiOptions;
              return await original({
                ...actualOptions,
                security,
                baseURL: baseUrl,
                auth: latestConfig.auth,
              });
            }
          }
          throw error;
        }
      };
    });

    isInitialized = true;
  }

  client.setConfig({
    ...(apiOptions as unknown as ClientOptions),
    auth: apiOptions.auth,
    security: [{ type: 'http', scheme: 'bearer' }],
  } as any);

  return client;
}
