import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import { Button, designTokens, EmptyState, Icon as Feather, Page, Stack } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ErrorBoundary } from './error-boundary';
import type { ErrorBoundaryFallbackProps } from './error-boundary';

function ScreenCrashFallback({ onRetry }: Readonly<ErrorBoundaryFallbackProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Page tone="muted" pad="md">
      <Stack align="center" justify="center" flex="grow" width="full">
        <EmptyState
          icon={
            <Feather
              name="alert-triangle"
              size={designTokens.icon.prominent}
              color={colors.error}
            />
          }
          title={t('errorBoundary.screenTitle')}
          description={t('errorBoundary.screenDescription')}
          action={
            <Stack direction="row" gap="sm">
              {/* `/` (not `/home`) so this is safe to press from *any* screen,
                  including a not-yet-authenticated one -- index.tsx already
                  knows how to redirect based on auth state. */}
              <Button variant="neutral" onPress={() => router.replace('/')}>
                {t('errorBoundary.goHome')}
              </Button>
              <Button variant="primary" onPress={onRetry}>
                {t('errorBoundary.retry')}
              </Button>
            </Stack>
          }
        />
      </Stack>
    </Page>
  );
}

/**
 * Wraps a single Expo Router screen. Every route under `app/` is a thin
 * `export default function XRoute() { return <XScreen />; }` -- this wraps
 * that render so a crash inside one screen (the shape of issue #180's
 * `OneTimeSecretCard` bug) is caught right there instead of unmounting
 * whatever layout/navigator is hosting it.
 *
 * Deliberately a hand-rolled boundary rather than Expo Router's own per-route
 * `ErrorBoundary` export convention: that hands retry/reset semantics and the
 * exact logging behavior to router internals we don't control. This version
 * is explicit, shares its implementation and logging with `AppErrorBoundary`,
 * and is unit-testable the same way any other component here is.
 *
 * Scoped to one screen so a crash there doesn't take the Stack/Tabs navigator
 * down with it -- the tab bar / header stay mounted, and the fallback below
 * offers a way back to the start in addition to retrying in place.
 */
export function RouteErrorBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ErrorBoundary fallback={(props) => <ScreenCrashFallback {...props} />}>
      {children}
    </ErrorBoundary>
  );
}
