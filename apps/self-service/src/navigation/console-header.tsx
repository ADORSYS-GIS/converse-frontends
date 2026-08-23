import React from 'react';
import { View } from 'react-native';
import { useTranslation } from '@lightbridge/i18n';
import { designTokens, Image } from '@lightbridge/ui';

import { useRuntimeConfig } from '../configs/runtime-config';

/**
 * ADR 0008 Decision 8: "a logo URL belongs in admin config and is rendered in the header." This
 * is that header — the `#111` "header/nav" tonal layer from Decision 5 (`bg-chrome`, see
 * tailwind-preset.js), sitting above the shell's left panel + floor.
 *
 * Renders nothing when no `logoUrl` is configured, the same "ships dark until an operator
 * configures it" pattern `usage`/`EXPO_PUBLIC_GRAFANA_URL` already uses in this file
 * (`runtime-config.tsx`) — not a feature flag, just an unset optional value.
 */
export function ConsoleHeader() {
  const { logoUrl } = useRuntimeConfig();
  const { t } = useTranslation();

  if (!logoUrl) {
    return null;
  }

  return (
    <View
      testID="console-header"
      className="bg-chrome"
      style={{
        height: designTokens.layout.topBarMinHeight,
        paddingHorizontal: designTokens.spacing.topBarHorizontal,
        justifyContent: 'center',
      }}>
      <Image
        source={{ uri: logoUrl }}
        contentFit="contain"
        accessibilityLabel={t('app.brand')}
        style={{ height: designTokens.icon.prominent, width: designTokens.icon.prominent * 4 }}
      />
    </View>
  );
}
