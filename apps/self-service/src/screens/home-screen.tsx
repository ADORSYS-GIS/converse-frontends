import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
import { useRuntimeConfig } from '../configs/runtime-config';

export type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown';

export type ServiceInfo = {
  key: string;
  name: string;
  version: string;
  status: ServiceStatus;
};

async function checkServiceHealth(url: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
    });
    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}

export function HomeScreen() {
  const { session } = useAuthSession();
  const { data: usage = [] } = useTokenUsage();
  const { data: project } = useCurrentProject();
  const { mutate: ensureAccount } = useEnsureDefaultAccount();
  const { mutate: ensureProject } = useEnsureDefaultProject();
  const config = useRuntimeConfig();
  useQueryUsage();
  const router = useRouter();
  const bootstrapRef = useRef(false);
  const authReady = getAuthReady();

  // Health check for services
  const { data: services = [] } = useQuery({
    queryKey: ['service-health'],
    queryFn: async (): Promise<ServiceInfo[]> => {
      const results: ServiceInfo[] = [];

      // Check gateway health if URL is configured
      if (config.gatewayUrl) {
        const status = await checkServiceHealth(config.gatewayUrl);
        results.push({
          key: 'production-gateway',
          name: 'Production Gateway',
          version: '2.4.1',
          status,
        });
      }

      // Check analytics health if URL is configured
      if (config.analyticsUrl) {
        const status = await checkServiceHealth(config.analyticsUrl);
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
      services={services}
      onNewToken={() => router.navigate('/api-keys/new')}
      onEndpoints={() => router.push('/api-keys')}
      onUsageLogs={() => router.push('/usage')}
      onSupport={() => router.push('/help')}
    />
  );
}
