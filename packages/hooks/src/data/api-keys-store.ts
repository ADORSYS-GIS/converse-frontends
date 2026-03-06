import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

import type { ApiKeyBackendApiKey } from '@lightbridge/api-rest';

export type StoredApiKey = ApiKeyBackendApiKey;

export const apiKeysCollection = createCollection(
  localOnlyCollectionOptions<StoredApiKey>({
    id: 'api-keys',
    getKey: (item: StoredApiKey) => item.id,
    initialData: [],
  })
);

// Helper to store API keys from server response
export async function syncApiKeys(items: StoredApiKey[]) {
  // For now, we just provide the collection for use
  // The actual syncing should happen via React Query
  // which is already set up in useApiKeys
  return apiKeysCollection;
}
