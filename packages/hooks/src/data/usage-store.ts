import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

import { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';

export type TokenUsage = UsageBackendUsageSeriesPoint;

export const usageCollection = createCollection(
  localOnlyCollectionOptions<TokenUsage>({
    id: 'token-usage',
    getKey: (item: TokenUsage) => item.bucket_start,
    initialData: [],
  })
);

export async function setTokenUsage(items: TokenUsage[] = []) {
  await Promise.all(
    items.map(async (i) => {
      usageCollection.insert(i);
    })
  );
}
