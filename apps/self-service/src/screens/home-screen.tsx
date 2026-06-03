import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthSession, useSignOut, useQueryUsage } from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';
import { useRuntimeConfig } from '../configs/runtime-config';

const getUtcDayStamp = (value: Date) =>
  value.getUTCFullYear() * 10_000 + (value.getUTCMonth() + 1) * 100 + value.getUTCDate();

/** Default billing cycle start day when not configured. */
const DEFAULT_BILLING_DAY = 6;

/**
 * Compute the start of the current billing period.
 */
function getBillingPeriodStart(billingDay: number, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (now.getUTCDate() >= billingDay) {
    return new Date(Date.UTC(year, month, billingDay, 0, 0, 0));
  }
  return new Date(Date.UTC(year, month - 1, billingDay, 0, 0, 0));
}

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
  const config = useRuntimeConfig();

  const [, setDayStamp] = useState(() => getUtcDayStamp(new Date()));

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

  const billingDay = config.usageBillingDay ?? DEFAULT_BILLING_DAY;

  const timeWindow = useMemo(() => {
    const now = new Date();
    const startTime = getBillingPeriodStart(billingDay, now);
    const endTime = now;
    return { startTime, endTime };
  }, [billingDay]);

  const daysDifference = useMemo(() => {
    return Math.max(
      1,
      Math.ceil((timeWindow.endTime.getTime() - timeWindow.startTime.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [timeWindow]);

  const usageQueryParams = useMemo(
    () => ({
      ...timeWindow,
      bucket: `${daysDifference} days` as const,
    }),
    [timeWindow, daysDifference]
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

  const { usedCost } = useMemo(() => {
    const points = usageResponse?.points ?? [];
    const used = points.reduce((acc, point) => acc + ((point.usage_value ?? 0) / 1_000_000), 0);

    return {
      usedCost: used,
    };
  }, [usageResponse]);

  const startDateString = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return formatter.format(timeWindow.startTime);
  }, [timeWindow.startTime]);

  return (
        <HomeView
      userName={session.user?.name}
      usedRequests={usedCost}
      startDate={startDateString}
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
