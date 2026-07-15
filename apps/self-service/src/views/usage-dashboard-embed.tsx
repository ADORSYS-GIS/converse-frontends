import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { Button, Card, EmptyState, Icon as Feather, Scroll, Stack } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';

export type UsageDashboardEmbedProps = {
  url: string;
  onOpenExternal: () => void;
};

/**
 * Native (iOS/Android) fallback. There's no iframe on native and
 * `react-native-webview` isn't a dependency, so rather than embed we open the
 * dashboard in the system browser — which also carries the shared Keycloak SSO
 * session, so per-user scoping still holds.
 */
export function UsageDashboardEmbed({ onOpenExternal }: Readonly<UsageDashboardEmbedProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
      <Card size="md">
        <Stack gap="md">
          <EmptyState
            icon={<Feather name="bar-chart-2" size={28} color={colors.subtle} />}
            title={t('usage.native.title')}
            description={t('usage.native.description')}
            action={
              <Button variant="primary" size="sm" onPress={onOpenExternal}>
                {t('usage.openExternal')}
              </Button>
            }
          />
        </Stack>
      </Card>
    </Scroll>
  );
}
