import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiKeyBackendAccount } from '@lightbridge/api-rest';
import { apiKeyBackendListAccounts } from '@lightbridge/api-rest';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts() {
  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const response = await apiKeyBackendListAccounts<true>();
      return response.data;
    },
  });

  const items = useMemo<ApiKeyBackendAccount[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentAccount() {
  const { data, ...query } = useAccounts();

  const current = useMemo<ApiKeyBackendAccount | undefined>(() => {
    return data && data.length > 0 ? data[0] : undefined;
  }, [data]);

  return { ...query, data: current };
}
