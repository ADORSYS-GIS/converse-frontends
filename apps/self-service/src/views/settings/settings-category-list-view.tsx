import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import { Card, designTokens, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../../hooks/use-theme-colors';
import type { SettingsCategory, SettingsCategoryKey } from '../../navigation/settings-categories';

type SettingsCategoryListViewProps = {
  categories: SettingsCategory[];
  activeKey?: SettingsCategoryKey;
  onSelect: (category: SettingsCategory) => void;
  variant?: 'list' | 'rail';
};

export function SettingsCategoryListView({
  categories,
  activeKey,
  onSelect,
  variant = 'list',
}: Readonly<SettingsCategoryListViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isRail = variant === 'rail';

  const content = (
    <Stack gap="xs" width="full">
      {categories.map((category) => {
        const active = category.key === activeKey;

        return (
          <Div
            key={category.key}
            tone={active && isRail ? 'brandSoft' : 'default'}
            rounded="md"
            pad="md"
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(category.titleKey)}
            onPress={() => onSelect(category)}
            style={{ borderWidth: active && isRail ? 1 : 0, borderColor: colors.primary }}>
            <Stack direction="row" align="center" justify="between" width="full" gap="sm">
              <Stack direction="row" align="center" gap="sm">
                <Ionicons
                  name={category.iconName}
                  size={designTokens.icon.action}
                  color={active && isRail ? colors.primary : colors.soft}
                />
                <Text intent={active && isRail ? 'link' : 'bodyStrong'}>
                  {t(category.titleKey)}
                </Text>
              </Stack>
              {isRail ? null : <Ionicons name="chevron-forward" size={18} color={colors.subtle} />}
            </Stack>
          </Div>
        );
      })}
    </Stack>
  );

  if (isRail) {
    return (
      <Div
        tone="surface"
        width="full"
        pad="md"
        style={{ borderRightWidth: 1, borderRightColor: colors.border, minWidth: 220 }}>
        <Stack gap="md">
          <Text intent="eyebrow">{t('settings.title')}</Text>
          {content}
        </Stack>
      </Div>
    );
  }

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack gap="xs">
          <Heading tone="title">{t('settings.title')}</Heading>
          <Text intent="body">
            {t('settings.subtitle', {
              defaultValue: 'Manage your account, billing, and preferences.',
            })}
          </Text>
        </Stack>
        {/* Group the categories into a single card so the index reads as an
            intentional list rather than a lone row floating in the column. */}
        <Card size="sm">{content}</Card>
      </Stack>
    </Scroll>
  );
}
