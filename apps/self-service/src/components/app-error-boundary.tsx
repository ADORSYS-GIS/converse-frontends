import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { Button, designTokens, EmptyState, Icon as Feather, Page, Stack } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ErrorBoundary } from './error-boundary';
import type { ErrorBoundaryFallbackProps } from './error-boundary';

function AppCrashFallback({ onRetry }: Readonly<ErrorBoundaryFallbackProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

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
          title={t('errorBoundary.title')}
          description={t('errorBoundary.description')}
          action={
            <Button variant="primary" onPress={onRetry}>
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      </Stack>
    </Page>
  );
}

/**
 * Last line of defense, mounted once around the app content in `_layout.tsx`
 * (see `RootLayout`). Every screen also gets its own `RouteErrorBoundary` (see
 * that file) which is the boundary that actually fires for a screen-level
 * crash like the one in issue #180 -- this one exists for whatever a
 * per-route boundary can't cover: an error thrown from `AppBootstrap` itself,
 * a provider, or the navigator setup rather than from within a specific
 * screen.
 *
 * Deliberately does not offer in-app navigation as a recovery option. At this
 * level the Stack/Tabs navigator itself may be the thing that failed to
 * render, so there is no guarantee `useRouter()` has a `NavigationContainer`
 * to talk to. "Try again" only resets local state and remounts `children`.
 */
export function AppErrorBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ErrorBoundary fallback={(props) => <AppCrashFallback {...props} />}>{children}</ErrorBoundary>
  );
}
