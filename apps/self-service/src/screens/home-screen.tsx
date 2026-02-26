import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';

import {
  useAuthSession,
  useTokenUsage,
  useCurrentProject,
  useQueryUsage,
} from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';

export function HomeScreen() {
  const { session } = useAuthSession();
  const { data: usage = [] } = useTokenUsage();
  const { data: project } = useCurrentProject();
  useQueryUsage();
  const router = useRouter();

  const { usedRequests, totalRequests, usagePercent } = useMemo(() => {
    const used = usage.reduce((acc, item) => acc + (item.requests || 0), 0);
    // Use project limits or default to a reasonable number for display if not set
    const total = project?.default_limits?.requests_per_day || 1000;
    const percent = total > 0 ? (used / total) * 100 : 0;

    return {
      usedRequests: used,
      totalRequests: total,
      usagePercent: percent,
    };
  }, [usage, project]);

  return (
    <HomeView
      userName={session.user?.name}
      usagePercent={usagePercent}
      usedRequests={usedRequests}
      totalRequests={totalRequests}
      onNewToken={() => router.navigate('/api-keys/new')}
      onEndpoints={() => router.push('/api-keys')}
      onUsageLogs={() => router.push('/usage')}
      onSupport={() => router.push('/help')}
    />
  );
}
