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
  const { isAuthenticated, session } = useAuthSession();
  const { isHydrated } = useAuthHydration();

  useClientInit(
    {
      baseURL: runtimeConfig.backendUrl,
      auth: async (_a) => {
        // Wait for auth to be hydrated before returning token
        if (!isHydrated) {
          return '';
        }
        return session.tokens?.accessToken ?? '';
      },
    },
    {
      baseURL: runtimeConfig.usageUrl,
      auth: async (_a) => {
        // Wait for auth to be hydrated before returning token
        if (!isHydrated) {
          return '';
        }
        return session.tokens?.accessToken ?? '';
      },
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

    if (!isAuthenticated && !inAuthGroup && !inHelpRoute) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/home');
    }
  }, [isAuthenticated, isHydrated, pathname, router, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts([
    AppFont.BakbakOne,
    AppFont.EricaOne,
    AppFont.MontserratRegular,
    AppFont.MontserratSemiBold,
  ]);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const webFallback = isWebPlatform() ? <AppSplashView /> : null;

  useEffect(() => {
    if (fontsLoaded && runtimeReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, runtimeReady]);

  return (
    <I18nProvider>
      <RuntimeConfigProvider fallback={webFallback} onReady={() => setRuntimeReady(true)}>
        <QueryClientProvider client={queryClient}>
          {fontsLoaded ? <AppBootstrap /> : webFallback}
        </QueryClientProvider>
      </RuntimeConfigProvider>
    </I18nProvider>
  );
}
