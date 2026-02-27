import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  useAuthSession,
  useTokenUsage,
  useCurrentProject,
  useQueryUsage,
  useEnsureDefaultAccount,
  useEnsureDefaultProject,
  getAuthReady,
} from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';

export function HomeScreen() {
  const { session } = useAuthSession();
  const { data: usage = [] } = useTokenUsage();
  const { data: project } = useCurrentProject();
  const { mutate: ensureAccount } = useEnsureDefaultAccount();
  const { mutate: ensureProject } = useEnsureDefaultProject();
  useQueryUsage();
  const router = useRouter();
  const bootstrapRef = useRef(false);
  const authReady = getAuthReady();

  useEffect(() => {
    // Only bootstrap once after auth is ready to prevent 401 errors
    if (bootstrapRef.current || !authReady) {
      return;
    }

    bootstrapRef.current = true;

    const bootstrap = async () => {
      try {
        const account = await ensureAccount();
        if (account?.id) {
          await ensureProject(account.id);
        }
      } catch (err) {
        console.error('[Bootstrap] Failed to ensure default account/project:', err);
      }
    };
    bootstrap();
  }, [ensureAccount, ensureProject, authReady]);

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
