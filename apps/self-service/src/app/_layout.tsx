import React, { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { Alert, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';
import * as WebBrowser from 'expo-web-browser';

import '../../global.css';
import { I18nProvider } from '@lightbridge/i18n';
import {
  useAuthHydration,
  useAuthSession,
  useBackendSync,
  useLocaleSync,
  refreshAccessToken,
  clearPersistedAuthSession,
  getLatestAuthSession,
} from '@lightbridge/hooks';
import { APP_FONT_SOURCES, useAppFonts } from '@lightbridge/ui';
import { queryClient } from '../queries';
import { useClientInit } from '@lightbridge/api-rest';
import { isWebPlatform } from '@lightbridge/api-native';
import { RuntimeConfigProvider, useRuntimeConfig } from '../configs/runtime-config';
import { AppSplashView } from '../views/app-splash-view';

WebBrowser.maybeCompleteAuthSession();
enableScreens();
void SplashScreen.preventAutoHideAsync();

function AppBootstrap() {
  const runtimeConfig = useRuntimeConfig();
  const { isAuthenticated, session, isTokenExpired } = useAuthSession();
  const { isHydrated } = useAuthHydration();

  const handleRefreshAuth = async () => {
    const refreshToken = session.tokens?.refreshToken;
    if (!refreshToken) {
      return false;
    }
    const result = await refreshAccessToken(
      {
        issuer: runtimeConfig.keycloak.issuer,
        clientId: runtimeConfig.keycloak.clientId,
      },
      refreshToken
    );
    return result !== null;
  };

  const handleRefreshFailure = React.useCallback(() => {
    console.warn('[Auth] Token refresh failed definitively. Clearing session.');
    // Clear the session IMMEDIATELY so the auth guard redirects to login.
    // Do not defer this behind an Alert callback — on web the Alert may
    // never appear, leaving the user stuck with a dead session.
    void clearPersistedAuthSession();
    Alert.alert('Session Expired', 'Your session has expired. Please log in again to continue.', [
      { text: 'OK' },
    ]);
  }, []);

  useClientInit(
    {
      baseURL: runtimeConfig.backendUrl,
      auth: async (_a) => {
        if (!isHydrated) {
          return '';
        }
        return getLatestAuthSession().tokens?.accessToken ?? '';
      },
      refreshAuth: handleRefreshAuth,
      getExpiresAt: () => getLatestAuthSession().tokens?.expiresAt,
      onRefreshFailure: handleRefreshFailure,
    },
    {
      baseURL: runtimeConfig.usageUrl || runtimeConfig.backendUrl,
      auth: async (_a) => {
        if (!isHydrated) {
          return '';
        }
        return getLatestAuthSession().tokens?.accessToken ?? '';
      },
      refreshAuth: handleRefreshAuth,
      getExpiresAt: () => getLatestAuthSession().tokens?.expiresAt,
      onRefreshFailure: handleRefreshFailure,
    }
  );

  useBackendSync();
  useLocaleSync();

  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const [first] = segments;
    const inAuthGroup =
      pathname === '/login' ||
      pathname?.startsWith('/login/') ||
      segments.includes('(auth)') ||
      first === 'login';
    const inHelpRoute =
      pathname === '/help' || pathname?.startsWith('/help/') || segments.includes('help');
    const inApiKeysRoute =
      pathname === '/api-keys/new' ||
      pathname?.startsWith('/api-keys/') ||
      pathname === '/delete-api-key' ||
      pathname?.startsWith('/delete-api-key');
    const inSettingsStandaloneRoute =
      pathname === '/settings-account' ||
      pathname?.startsWith('/settings-account') ||
      pathname === '/delete-account' ||
      pathname?.startsWith('/delete-account');
    const inTabsGroup = segments.includes('(tabs)');

    if (!isAuthenticated && !inAuthGroup && !inHelpRoute) {
      router.replace('/login');
      return;
    }

    if (
      isAuthenticated &&
      !inTabsGroup &&
      !inHelpRoute &&
      !inApiKeysRoute &&
      !inSettingsStandaloneRoute
    ) {
      router.replace('/home');
      return;
    }

    // Only clear session if we are definitely NOT authenticated and NOT in auth group
    // The actual token refresh failure is handled by useClientInit's onRefreshFailure
    if (!isAuthenticated && !inAuthGroup && !inHelpRoute) {
      router.replace('/login');
    }
  }, [
    isAuthenticated,
    isHydrated,
    pathname,
    router,
    segments,
    isTokenExpired,
    session.tokens?.expiresAt,
  ]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts(APP_FONT_SOURCES);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const colorScheme = useColorScheme();
  const webFallback = isWebPlatform() ? <AppSplashView /> : null;

  // Keep the NativeWind class-based dark theme (className tokens → CSS variables)
  // in lockstep with useColorScheme, which also drives useThemeColors' inline
  // colors. Without this the two desync on web — the class is never applied, so
  // className tokens stay light while inline colors follow the OS, producing the
  // "half-dark" split (e.g. the MCP builder rendering as a dark island).
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.classList.toggle('dark', colorScheme === 'dark');
  }, [colorScheme]);

  const handleRuntimeReady = React.useCallback(() => {
    setRuntimeReady(true);
  }, []);

  useEffect(() => {
    if (fontsLoaded && runtimeReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, runtimeReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <RuntimeConfigProvider fallback={webFallback} onReady={handleRuntimeReady}>
          <QueryClientProvider client={queryClient}>
            {fontsLoaded ? <AppBootstrap /> : webFallback}
          </QueryClientProvider>
        </RuntimeConfigProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
