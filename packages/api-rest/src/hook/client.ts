import { client } from '../client/client.gen';
import { ClientOptions } from '../client/client';
import { Config } from '../client/core/types.gen';

export function useClientInit(options: ClientOptions & Config) {
  client.setConfig(options as unknown as ClientOptions);
  return client;
}
