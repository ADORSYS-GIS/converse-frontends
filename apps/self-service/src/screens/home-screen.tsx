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
      // In no-cors mode, we can't read the status, but reachability is enough.
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
    // Keep the 'start of today' computation in sync if the app stays open past midnight (UTC).
    // Avoid polling: schedule a single wake-up at the next UTC midnight.
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

  const startOfToday = useMemo(() => {
    const year = Math.floor(dayStamp / 10_000);
    const month = Math.floor((dayStamp % 10_000) / 100); // 1-12
    const day = dayStamp % 100;

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }, [dayStamp]);

  const usageQueryParams = useMemo(
    () => ({
      startTime: startOfToday,
      bucket: '1 day' as const,
    }),
    [startOfToday]
  );

  const { data: usageResponse } = useQueryUsage(usageQueryParams);

  const router = useRouter();

  useEffect(() => {
    // React 18 StrictMode (dev) mounts/unmounts effects twice.
    // Ensure we re-mark as mounted on the second pass.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onLogout = useCallback(() => {
    // Guard against rapid double taps; refs update synchronously.
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

      if (config.gatewayUrl) {
        const url = config.gatewayUrl.endsWith('/')
          ? `${config.gatewayUrl}v1/models`
          : `${config.gatewayUrl}/v1/models`;

        const status = await checkServiceHealth(url, {
          headers: config.gatewayBearerToken
            ? { Authorization: `Bearer ${config.gatewayBearerToken}` }
            : undefined,
        });

        results.push({
          key: 'production-gateway',
          name: 'Production Gateway',
          version: '2.4.1',
          status,
        });
      }

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
    enabled: !!(config.gatewayUrl || config.analyticsUrl),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const { usedRequests, totalRequests, usagePercent } = useMemo(() => {
    const points = usageResponse?.points ?? [];
    const used = points.reduce((acc, item) => acc + (item.requests ?? 0), 0);
    const total = project?.default_limits?.requests_per_day || 1000;
    const percent = total > 0 ? (used / total) * 100 : 0;

    return {
      usedRequests: used,
      totalRequests: total,
      usagePercent: percent,
    };
  }, [usageResponse, project]);

  return (
    <HomeView
      userName={session.user?.name}
      usagePercent={usagePercent}
      usedRequests={usedRequests}
      totalRequests={totalRequests}
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
