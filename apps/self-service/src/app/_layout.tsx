import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Alert } from 'react-native';
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
  useBootstrapWorkspace,
  useLocaleSync,
  refreshAccessToken,
  clearPersistedAuthSession,
  getLatestAuthSession,
} from '@lightbridge/hooks';
import { APP_FONT_SOURCES, useAppFonts } from '@lightbridge/ui';
import { createBatchLink } from '@cratestack/api';
import { queryClient } from '../queries';
import { useAuthzRpcClient, useBudgetRpcClient } from '@lightbridge/authz-rpc';
import { isWebPlatform } from '@lightbridge/api-native';
import { RuntimeConfigProvider, useRuntimeConfig } from '../configs/runtime-config';
import { AppSplashView } from '../views/app-splash-view';
import { ThemePreferenceProvider } from '../theme/theme-preference';
import { AppSheetProvider } from '../navigation/app-sheet-provider';
import { AppErrorBoundary } from '../components/app-error-boundary';

WebBrowser.maybeCompleteAuthSession();
enableScreens();
void SplashScreen.preventAutoHideAsync();

// Module-scope, not per-render: `links` is a construction-only option on `AuthzRpcRuntime` (see
// its doc comment) — `useAuthzRpcClient` only re-applies it on the very first call anyway, but a
// single shared scheduler instance also avoids ever having two independent batch queues alive at
// once, which a fresh `createBatchLink()` per render would risk.
const authzBatchLink = createBatchLink();

// A separate scheduler for the budget client, same reasoning as `authzBatchLink` above -- the two
// clients hit different origins, so their batch queues must never be merged into one.
const budgetBatchLink = createBatchLink();

// `authz-budget` mounts its RPC surface under a FIXED `/budget` prefix, unlike `authz-api`'s
// configurable `apiBasePath` -- see `AppRuntimeConfig.budgetBaseUrl`'s doc comment and
// `docs/architecture/budget.md` in `lightbridge-authz`.
const BUDGET_RPC_BASE_PATH = '/budget';

function AppBootstrap() {
  const runtimeConfig = useRuntimeConfig();
  const { isAuthenticated, session } = useAuthSession();
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

  // Shared between both RPC clients: `authz-budget` requires the exact same caller identity
  // (Keycloak access token) as `authz-api` — the split only changed which host/path prefix serves
  // a budget op-id, never what a caller needs to authenticate (`docs/architecture/budget.md`).
  const sharedAuthOptions = {
    auth: async () => {
      if (!isHydrated) {
        return '';
      }
      return getLatestAuthSession().tokens?.accessToken ?? '';
    },
    refreshAuth: handleRefreshAuth,
    getExpiresAt: () => getLatestAuthSession().tokens?.expiresAt,
    onRefreshFailure: handleRefreshFailure,
  };

  useAuthzRpcClient({
    baseURL: runtimeConfig.backendUrl,
    basePath: runtimeConfig.apiBasePath,
    links: [authzBatchLink],
    ...sharedAuthOptions,
  });

  // The 14 budget:*-gated procedures (policy lifecycle, self-service refill + admin review,
  // balance/ledger reads, direct grant/revoke) live only here post-split — see
  // `getBudgetRpcClient`'s doc comment in `@lightbridge/authz-rpc` for the authoritative list.
  useBudgetRpcClient({
    baseURL: runtimeConfig.budgetBaseUrl,
    basePath: BUDGET_RPC_BASE_PATH,
    links: [budgetBatchLink],
    ...sharedAuthOptions,
  });

  useBackendSync();
  useBootstrapWorkspace();
  useLocaleSync();

  // Declarative auth guard. `Stack.Protected` mounts a group of screens only
  // while its `guard` is true; when a guard flips false under the user's feet
  // (login, logout, token-refresh failure), expo-router falls back to the anchor
  // route — `index` — which redirects to `/home` or `/login`. This replaces the
  // former hand-matched pathname allow-list, so adding a screen no longer means
  // editing a redirect effect. `help` stays outside both groups: it must be
  // reachable pre-auth (from the login screen) and post-auth alike.
  //
  // Guards stay open (`!isHydrated || …`) until the persisted session has
  // hydrated, so a cold start never flashes login before auth state is known.
  const authed = !isHydrated || isAuthenticated;
  const unauthed = !isHydrated || !isAuthenticated;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="help" />
        <Stack.Protected guard={unauthed}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
        <Stack.Protected guard={authed}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="api-keys/new" />
          <Stack.Screen name="settings-account" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <I18nProvider>
          <RuntimeConfigProvider fallback={webFallback} onReady={handleRuntimeReady}>
            <QueryClientProvider client={queryClient}>
              {fontsLoaded ? (
                <AppErrorBoundary>
                  <AppSheetProvider>
                    <AppBootstrap />
                  </AppSheetProvider>
                </AppErrorBoundary>
              ) : (
                webFallback
              )}
            </QueryClientProvider>
          </RuntimeConfigProvider>
        </I18nProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
