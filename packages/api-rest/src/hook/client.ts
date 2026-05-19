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

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

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
        await refreshPromise;
      } finally {
        refreshPromise = null;
      }
    } else {
      await refreshPromise;
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
            if (refreshPromise === null && targetConfig.refreshAuth) {
              refreshPromise = targetConfig.refreshAuth();
              try {
                const success = await refreshPromise;
                if (!success) {
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
              } catch {
                throw error;
              } finally {
                refreshPromise = null;
              }
            } else if (refreshPromise !== null) {
              await refreshPromise;
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
