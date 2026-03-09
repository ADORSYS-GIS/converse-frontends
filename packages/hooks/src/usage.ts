import { useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { useQuery } from '@tanstack/react-query';

import { usageBackendQueryUsage } from '@lightbridge/api-rest';
import { usageCollection, setTokenUsage } from './data/usage-store';
import { useCurrentProject } from './projects';
import { useAuthSession } from './auth-session';

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

export function useQueryUsage() {
  const { data: project } = useCurrentProject();
  const { isAuthenticated } = useAuthSession();

  return useQuery({
    queryKey: ['usage', project?.id],
    queryFn: async () => {
      if (!project?.id) return null;

      const now = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);

      const response = await usageBackendQueryUsage({
        body: {
          scope: 'project',
          scope_id: project.id,
          start_time: lastMonth.toISOString(),
          end_time: now.toISOString(),
          bucket: '1 day',
        },
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
