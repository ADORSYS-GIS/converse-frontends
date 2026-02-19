import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

import type { TokenUsage } from '@lightbridge/api-rest';

export const usageCollection = createCollection(
  localOnlyCollectionOptions<TokenUsage>({
    id: 'token-usage',
    getKey: (item: TokenUsage) => item.date,
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
