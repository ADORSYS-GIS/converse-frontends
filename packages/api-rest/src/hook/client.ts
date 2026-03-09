import { client } from '../client/client.gen';
import { ClientOptions } from '../client/client';
import { Config as ApiConfig } from '../client/core/types.gen';

export type ClientInitOptions = ClientOptions &
  ApiConfig & {
    refreshAuth?: () => Promise<boolean>;
    getExpiresAt?: () => number | undefined;
  };

let isInitialized = false;
let latestApiOptions: ClientInitOptions;
let latestUsageOptions: ClientInitOptions;
let refreshPromise: Promise<boolean> | null = null;

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // Refresh if token expires within 60 seconds

async function tryProactiveRefresh(targetConfig: ClientInitOptions): Promise<void> {
  if (!targetConfig.refreshAuth || !targetConfig.getExpiresAt) {
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
        if (!success) {
          console.log('[API Client] Proactive token refresh failed');
        }
      } catch (err) {
        console.log('[API Client] Proactive token refresh error:', err);
      } finally {
        refreshPromise = null;
      }
    } else {
      await refreshPromise;
    }
  }
}

// Helper to determine if request is for usage API
function isUsageRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('/usage/v1') ||
    url.startsWith('/v1/usage') ||
    url.startsWith('/v1/otel') ||
    url.startsWith('/health')
  );
}

// Helper for debugging
async function debugAuth(method: string, url: string, targetConfig: ClientInitOptions) {
  if (__DEV__) {
    const authValue = await (typeof targetConfig.auth === 'function'
      ? targetConfig.auth({ type: 'http' } as any)
      : targetConfig.auth);
    console.log(`[API Client] ${method.toUpperCase()} ${url} -> ${targetConfig.baseURL}${url}`);
    console.log(`[API Client] Auth Token: ${authValue ? 'Present' : 'Missing'}`);
    if (!authValue) {
      console.log(`[API Client] Warning: No auth token available for request`);
    }
  }
}

export function useClientInit(apiOptions: ClientInitOptions, usageOptions: ClientInitOptions) {
  // Update options on every render to get fresh auth tokens
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
        let actualOptions = options;
        if (typeof options === 'string') {
          /* empty */
        }

        const isUsage = isUsageRequest(actualOptions.url);
        const targetConfig = isUsage ? latestUsageOptions : latestApiOptions;
        const baseUrl = targetConfig.baseURL;

        const security = actualOptions.security ?? [{ type: 'http', scheme: 'bearer' }];

        await tryProactiveRefresh(targetConfig);
        await debugAuth(method, actualOptions.url, targetConfig);

        try {
          return await original({
            ...actualOptions,
            security,
            baseURL: baseUrl,
            auth: targetConfig.auth,
          });
        } catch (error: any) {
          if (error?.status === 401 || error?.response?.status === 401) {
            console.log('[API Client] 401 Unauthorized - Token may be expired');

            if (refreshPromise === null && targetConfig.refreshAuth) {
              refreshPromise = targetConfig.refreshAuth();
              try {
                const success = await refreshPromise;
                if (!success) {
                  console.log('[API Client] Token refresh failed, re-throwing 401');
                  throw error;
                }
                // Token refreshed, retry the request
                return await original({
                  ...actualOptions,
                  security,
                  baseURL: baseUrl,
                  auth: targetConfig.auth,
                });
              } catch (refreshError) {
                console.log('[API Client] Token refresh error:', refreshError);
                throw error;
              } finally {
                refreshPromise = null;
              }
            } else if (refreshPromise !== null) {
              await refreshPromise;
              return await original({
                ...actualOptions,
                security,
                baseURL: baseUrl,
                auth: targetConfig.auth,
              });
            }
          }
          throw error;
        }
      };
    });

    isInitialized = true;
  }

  // Call setConfig on each render to ensure latest options are used
  client.setConfig({
    ...(apiOptions as unknown as ClientOptions),
    auth: apiOptions.auth,
    security: [{ type: 'http', scheme: 'bearer' }],
  } as any);

  return client;
}
