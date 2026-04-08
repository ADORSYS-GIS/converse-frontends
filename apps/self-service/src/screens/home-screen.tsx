import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthSession, useSignOut, useCurrentProject, useQueryUsage } from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';
import { useRuntimeConfig } from '../configs/runtime-config';

const getUtcDayStamp = (value: Date) =>
  value.getUTCFullYear() * 10_000 + (value.getUTCMonth() + 1) * 100 + value.getUTCDate();

export type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown';

export type ServiceInfo = {
  key: string;
  name: string;
  version: string;
  status: ServiceStatus;
};

async function checkServiceHealth(
  url: string,
  options?: { headers?: Record<string, string>; noCors?: boolean }
): Promise<ServiceStatus> {
  if (!url || !url.startsWith('http')) {
    return 'unknown';
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      headers: options?.headers,
      mode: options?.noCors ? 'no-cors' : 'cors',
    });

    if (options?.noCors) {
      return 'healthy';
    }

    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}

export function HomeScreen() {
  const { session } = useAuthSession();
  const { signOut } = useSignOut();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);
  const isMountedRef = useRef(true);
  const { data: project } = useCurrentProject();
  const config = useRuntimeConfig();

  const [dayStamp, setDayStamp] = useState(() => getUtcDayStamp(new Date()));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextUtcMidnight = () => {
      const now = new Date();
      const nextUtcMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      );
      const msUntilNext = Math.max(0, nextUtcMidnight.getTime() - now.getTime());

      timeout = setTimeout(() => {
        setDayStamp(getUtcDayStamp(new Date()));
        scheduleNextUtcMidnight();
      }, msUntilNext + 1_000);
    };

    scheduleNextUtcMidnight();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const startOfPeriod = useMemo(() => {
    const year = Math.floor(dayStamp / 10_000);
    const month = Math.floor((dayStamp % 10_000) / 100); // 1-12
    const day = dayStamp % 100;

    return new Date(Date.UTC(year, month - 1, day - 29, 0, 0, 0, 0));
  }, [dayStamp]);

  const usageQueryParams = useMemo(
    () => ({
      startTime: startOfPeriod,
      bucket: '1 day' as const,
      groupBy: ['model'] as Array<'model'>, // Aligns cache with usage-screen.tsx!
      limit: 1000,
    }),
    [startOfPeriod]
  );

  const { data: usageResponse } = useQueryUsage(usageQueryParams);

  const router = useRouter();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onLogout = useCallback(() => {
    if (isSigningOutRef.current) return;

    isSigningOutRef.current = true;
    setIsSigningOut(true);

    void (async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out failed', error);
      } finally {
        isSigningOutRef.current = false;
        if (isMountedRef.current) {
          setIsSigningOut(false);
        }
      }
    })();
  }, [signOut]);

  const { data: services = [] } = useQuery({
    queryKey: ['service-health'],
    queryFn: async (): Promise<ServiceInfo[]> => {
      const results: ServiceInfo[] = [];

      if (config.analyticsUrl) {
        const status = await checkServiceHealth(config.analyticsUrl, {
          noCors: true,
        });
        results.push({
          key: 'analytics-engine',
          name: 'Analytics Engine',
          version: '1.8.0',
          status,
        });
      }

      return results;
    },
    enabled: !!config.analyticsUrl,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const { usedCost, totalBudget, usagePercent } = useMemo(() => {
    const points = usageResponse?.points ?? [];
    
    // Aggregate over identical array shapes as usage-screen
    const microUsed = points.reduce((acc, item) => acc + (item.total_cost ?? 0), 0);
    const used = microUsed / 1_000_000;
    const total = 30; // $30 budget per user request
    const percent = total > 0 ? (used / total) * 100 : 0;

    return {
      usedCost: used,
      totalBudget: total,
      usagePercent: percent,
    };
  }, [usageResponse]);

  return (
    <HomeView
      userName={session.user?.name}
      usagePercent={usagePercent}
      usedRequests={usedCost}
      totalRequests={totalBudget}
      services={services}
      onNewToken={() => router.navigate('/api-keys/new')}
      onEndpoints={() => router.push('/api-keys')}
      onUsageLogs={() => router.push('/usage')}
      onSupport={() => router.push('/help')}
      isSigningOut={isSigningOut}
      onLogout={onLogout}
    />
  );
}
