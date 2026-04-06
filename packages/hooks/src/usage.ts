import { useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { useQuery } from '@tanstack/react-query';

import {
  UsageBackendUsageQueryRequest,
  UsageBackendUsageScope,
  usageBackendQueryUsage,
} from '@lightbridge/api-rest';
import { usageCollection, setTokenUsage } from './data/usage-store';
import { useCurrentProject } from './projects';
import { useAuthSession } from './auth-session';

export type UsageQueryParams = {
  scope: UsageBackendUsageScope;
  scopeId: string;
  startTime: Date;
  endTime: Date;
  bucket?: string;
  filters?: {
    account_id?: string;
    metric_name?: string;
    model?: string;
    project_id?: string;
    signal_type?: string;
    user_id?: string;
  };
  groupBy?: ('account_id' | 'project_id' | 'user_id' | 'model' | 'metric_name' | 'signal_type')[];
  limit?: number;
};

export function useTokenUsage() {
  const { data } = useLiveQuery((q) => q.from({ usage: usageCollection }));

  const items = useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }, [data]);

  return { data: items };
}

export function useQueryUsage(params?: Partial<UsageQueryParams>) {
  const { data: project } = useCurrentProject();
  const { isAuthenticated } = useAuthSession();

  return useQuery({
    queryKey: ['usage', project?.id, params],
    queryFn: async () => {
      // Use provided params or fall back to defaults
      const scope = params?.scope ?? 'project';
      const scopeId = params?.scopeId ?? project?.id;

      if (!scopeId) return null;

      const startTime =
        params?.startTime ??
        (() => {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return lastMonth;
        })();

      const endTime = params?.endTime ?? new Date();

      const requestBody: UsageBackendUsageQueryRequest = {
        scope,
        scope_id: scopeId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        bucket: params?.bucket ?? '1 day',
      };

      // Add optional parameters if provided
      if (params?.filters) {
        requestBody.filters = params.filters;
      }

      if (params?.groupBy && params.groupBy.length > 0) {
        requestBody.group_by = params.groupBy;
      }

      if (params?.limit !== undefined) {
        requestBody.limit = params.limit;
      }

      const response = await usageBackendQueryUsage({
        body: requestBody,
      });

      if (response.data?.points) {
        await setTokenUsage(response.data.points);
      }

      return response.data;
    },
    enabled: !!project?.id && isAuthenticated,
  });
}

export async function refreshTokenUsage() {
  // This is now handled by useQueryUsage or can be triggered manually
  return null;
}
