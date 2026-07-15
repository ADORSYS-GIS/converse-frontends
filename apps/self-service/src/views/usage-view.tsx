import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { Button, designTokens, Div, Icon as Feather, PageHeader, Stack, Text } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';
import { UsageDashboardEmbed } from './usage-dashboard-embed';

type UsageViewProps = {
  /** Grafana embed URL (kiosk). Empty string only in the defensive unconfigured case. */
  embedUrl: string;
  /** Opens the full interactive dashboard in a real browser tab. */
  onOpenExternal: () => void;
};

/**
 * Usage tab shell: a slim header with an "open in Grafana" escape hatch over a
 * platform-resolved dashboard embed (iframe on web, an open-externally card on
 * native). The escape hatch matters because a cross-origin iframe blocked by
 * Grafana's `X-Frame-Options` renders blank with no error JS can catch — the
 * button is always the user's way out.
 */
export function UsageView({ embedUrl, onOpenExternal }: Readonly<UsageViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      <PageHeader
        title={t('usage.title')}
        trailing={
          <Button
            variant="neutral"
            size="sm"
            onPress={onOpenExternal}
            accessibilityLabel={t('usage.openExternal')}
            leadingIcon={
              <Feather name="external-link" size={designTokens.icon.action} color={colors.ink} />
            }>
            {t('usage.openExternal')}
          </Button>
        }
      />

      <Stack style={{ flex: 1 }} width="full">
        <UsageDashboardEmbed url={embedUrl} onOpenExternal={onOpenExternal} />
      </Stack>
    </Div>
  );
}
