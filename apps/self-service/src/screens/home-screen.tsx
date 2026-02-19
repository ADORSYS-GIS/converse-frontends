import React from 'react';
import { useRouter } from 'expo-router';

import { useAuthSession } from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';

export function HomeScreen() {
  const { session } = useAuthSession();
  const router = useRouter();

  return (
    <HomeView
      userName={session.user?.name}
      usagePercent={84.2}
      usedRequests={12402}
      totalRequests={15000}
      onNewToken={() => router.push('/api-key-editor')}
      onEndpoints={() => router.push('/api-keys')}
      onUsageLogs={() => router.push('/usage')}
      onSupport={() => router.push('/help')}
    />
  );
}
