import { useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';

import type { TokenUsage } from '@lightbridge/api-rest';
import { getTokenUsage } from '@lightbridge/api-rest';
import { setTokenUsage, usageCollection } from './data/usage-store';

export function useTokenUsage() {
  const { data } = useLiveQuery((q) => q.from({ usage: usageCollection }));

  const items = useMemo<TokenUsage[]>(() => {
    if (Array.isArray(data)) {
      return data as TokenUsage[];
    }
    return [];
  }, [data]);

  return { data: items };
}

export async function refreshTokenUsage() {
  const items = await getTokenUsage<true>();
  await setTokenUsage(items.data);
  return items;
}
