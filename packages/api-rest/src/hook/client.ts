import { client } from '../client/client.gen';
import { ClientOptions } from '../client/client';
import { Config as ApiConfig } from '../client/core/types.gen';

export type ClientInitOptions = ClientOptions & ApiConfig;

let isInitialized = false;
let latestApiOptions: ClientInitOptions;
let latestUsageOptions: ClientInitOptions;

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
        // Handle both (options) and (url, options) signatures
        let actualOptions = options;
        if (typeof options === 'string') {
          // This case might happen if called with request(url, options)
          // Though our generated SDK usually uses the single options object
        }

        const isUsage =
          actualOptions.url?.startsWith('/v1/usage') ||
          actualOptions.url?.startsWith('/v1/otel') ||
          actualOptions.url?.startsWith('/health');

        // CRITICAL: Get fresh options on EACH request - this ensures we get the latest auth token
        // The closure captures these variables, but we reassign them on each render, so we get fresh values
        const targetConfig = isUsage ? latestUsageOptions : latestApiOptions;
        const baseUrl = targetConfig.baseURL;

        // Ensure security is present so setAuthParams is called
        const security = actualOptions.security ?? [{ type: 'http', scheme: 'bearer' }];

        // Debugging 401 and 404
        if (__DEV__) {
          const authValue = await (typeof targetConfig.auth === 'function'
            ? targetConfig.auth({ type: 'http' } as any)
            : targetConfig.auth);
          console.log(
            `[API Client] ${method.toUpperCase()} ${actualOptions.url} -> ${baseUrl}${actualOptions.url}`
          );
          console.log(`[API Client] Auth Token: ${authValue ? 'Present' : 'Missing'}`);
          if (!authValue) {
            console.log(`[API Client] Warning: No auth token available for request`);
          }
        }

        return original({
          ...actualOptions,
          security,
          baseURL: baseUrl,
        });
      };
    });

    isInitialized = true;
  }

  // Call setConfig on each render to ensure latest options are used
  client.setConfig({
    ...(apiOptions as unknown as ClientOptions),
    // @ts-ignore
    security: [{ type: 'http', scheme: 'bearer' }],
  });

  return client;
}
