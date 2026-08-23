import React from 'react';
import { Linking } from 'react-native';
import { useTranslation } from '@lightbridge/i18n';
import { Card, Div, EmptyState, Icon as Feather, Scroll } from '@lightbridge/ui';

import { useRuntimeConfig } from '../configs/runtime-config';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useEffectiveColorScheme } from '../theme/theme-preference';
import { UsageView } from '../views/usage-view';
import { buildUsageDashboardUrl } from './usage-dashboard-url';

export function UsageScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scheme = useEffectiveColorScheme();
  const { usage } = useRuntimeConfig();

  // Defensive: since ADR 0008's nav-spine restructure, this route is no longer a top-level tab
  // (the spine is a strict Overview/Api-Keys/Manage/Admin four) — it's reached from Overview's
  // "Usage" quick action, itself hidden when usage is unconfigured (see home-view.tsx). A
  // deep-link could still land here directly, though — show a plain unavailable state rather
  // than a broken embed.
  if (!usage) {
    return (
      <Div tone="muted" width="full" style={{ flex: 1 }}>
        <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
          <Card size="md">
            <EmptyState
              icon={<Feather name="bar-chart-2" size={28} color={colors.subtle} />}
              title={t('usage.unavailable.title')}
              description={t('usage.unavailable.description')}
            />
          </Card>
        </Scroll>
      </Div>
    );
  }

  const embedUrl = buildUsageDashboardUrl(usage, scheme, true);
  const externalUrl = buildUsageDashboardUrl(usage, scheme, false);

  const handleOpenExternal = () => {
    void Linking.openURL(externalUrl);
  };

  return <UsageView embedUrl={embedUrl} onOpenExternal={handleOpenExternal} />;
}
