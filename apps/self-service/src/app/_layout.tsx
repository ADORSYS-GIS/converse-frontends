import React, { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
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
} from '@lightbridge/hooks';
import { AppFont, useAppFonts } from '@lightbridge/ui';
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

  useClientInit(
    {
      baseURL: runtimeConfig.backendUrl,
      auth: async (_a) => {
        if (!isHydrated) {
          return '';
        }
        return session.tokens?.accessToken ?? '';
      },
      refreshAuth: handleRefreshAuth,
      getExpiresAt: () => session.tokens?.expiresAt,
    },
    {
      baseURL: runtimeConfig.usageUrl || runtimeConfig.backendUrl,
      auth: async (_a) => {
        if (!isHydrated) {
          return '';
        }
        return session.tokens?.accessToken ?? '';
      },
      refreshAuth: handleRefreshAuth,
      getExpiresAt: () => session.tokens?.expiresAt,
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
    const inTabsGroup = segments.includes('(tabs)');

    if (!isAuthenticated && !inAuthGroup && !inHelpRoute) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && !inTabsGroup && !inHelpRoute && !inApiKeysRoute) {
      router.replace('/home');
      return;
    }

    if (isTokenExpired && isAuthenticated && !inAuthGroup) {
      clearPersistedAuthSession();
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

const APP_FONT_SOURCES = {
  [AppFont.BakbakOne]: '/fonts/BakbakOne_400Regular.ttf',
  [AppFont.EricaOne]: '/fonts/EricaOne_400Regular.ttf',
  [AppFont.MontserratRegular]: '/fonts/Montserrat_400Regular.ttf',
  [AppFont.MontserratSemiBold]: '/fonts/Montserrat_600SemiBold.ttf',
};

export default function RootLayout() {
  const fontsLoaded = useAppFonts(APP_FONT_SOURCES);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const webFallback = isWebPlatform() ? <AppSplashView /> : null;

  const handleRuntimeReady = React.useCallback(() => {
    setRuntimeReady(true);
  }, []);

  useEffect(() => {
    if (fontsLoaded && runtimeReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, runtimeReady]);

  return (
    <I18nProvider>
      <RuntimeConfigProvider fallback={webFallback} onReady={handleRuntimeReady}>
        <QueryClientProvider client={queryClient}>
          {fontsLoaded ? <AppBootstrap /> : webFallback}
        </QueryClientProvider>
      </RuntimeConfigProvider>
    </I18nProvider>
  );
}
