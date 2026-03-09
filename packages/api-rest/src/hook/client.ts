import { client } from '../client/client.gen';
import { ClientOptions } from '../client/client';
import { Config as ApiConfig } from '../client/core/types.gen';

export type ClientInitOptions = ClientOptions & ApiConfig;

let isInitialized = false;
let latestApiOptions: ClientInitOptions;
let latestUsageOptions: ClientInitOptions;
let refreshPromise: Promise<unknown> | null = null;

// Helper to determine if request is for usage API
function isUsageRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/v1/usage') || url.startsWith('/v1/otel') || url.startsWith('/health');
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
        }

        const isUsage = isUsageRequest(actualOptions.url);
        const targetConfig = isUsage ? latestUsageOptions : latestApiOptions;
        const baseUrl = targetConfig.baseURL;

        const security = actualOptions.security ?? [{ type: 'http', scheme: 'bearer' }];

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

            if (refreshPromise === null) {
              refreshPromise = Promise.resolve();
              try {
                throw new Error('Token expired');
              } finally {
                refreshPromise = null;
              }
            } else {
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
