import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  useAuthSession,
  useCurrentAccount,
  useCurrentProject,
  usePermissions,
  useSignOut,
} from '@lightbridge/hooks';
import { HomeView } from '../views/home-view';
import { useRuntimeConfig } from '../configs/runtime-config';

const getUtcDayStamp = (value: Date) =>
  value.getUTCFullYear() * 10_000 + (value.getUTCMonth() + 1) * 100 + value.getUTCDate();

export function HomeScreen() {
  const { session } = useAuthSession();
  const { has } = usePermissions();
  const { data: currentAccount } = useCurrentAccount();
  const { data: currentProject } = useCurrentProject();
  const config = useRuntimeConfig();
  const { signOut } = useSignOut(config.keycloak);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);
  const isMountedRef = useRef(true);

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

  return (
    <HomeView
      userName={session.user?.name}
      accountLabel={currentAccount?.id}
      activeProjectName={currentProject?.name}
      activeProjectPlan={currentProject?.billingPlan}
      onNewToken={() => router.navigate('/api-keys/new')}
      onManageKeys={() => router.navigate('/api-keys')}
      onSettings={() => router.navigate('/settings')}
      onSupport={() => router.push('/help')}
      isSigningOut={isSigningOut}
      onLogout={onLogout}
      canCreateKey={has('apikey:create')}
      onUsage={config.usage ? () => router.navigate('/usage') : undefined}
    />
  );
}
