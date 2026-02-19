import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { NavContainer, NavItem, Stack, Text } from '@lightbridge/ui';
import { useIsDesktop } from './use-is-desktop';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getThemeColors } from '../theme/theme-colors';

const iconSize = 22;

export function ResponsiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const isDesktop = useIsDesktop();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme);

  const getLabel = (routeKey: string, routeName: string) => {
    const options = descriptors[routeKey]?.options;
    if (typeof options?.tabBarLabel === 'string') {
      return options.tabBarLabel;
    }
    if (typeof options?.title === 'string') {
      return options.title;
    }
    return routeName;
  };

  const getIconName = (routeName: string, focused: boolean) => {
    type IoniconName = keyof typeof Ionicons.glyphMap;
    const iconMap: Record<string, { active: IoniconName; inactive: IoniconName }> = {
      home: { active: 'home', inactive: 'home-outline' },
      'api-keys': { active: 'key', inactive: 'key-outline' },
      'api-key-editor': { active: 'add-circle', inactive: 'add-circle-outline' },
      usage: { active: 'stats-chart', inactive: 'stats-chart-outline' },
    };

    const icon = iconMap[routeName];
    if (!icon) {
      return null;
    }

    return focused ? icon.active : icon.inactive;
  };

  if (isDesktop) {
    return (
      <NavContainer placement="sidebar">
        <Stack gap="md" flex="grow">
          <Text intent="eyebrow">{t('app.brand')}</Text>
          <Stack gap="sm" flex="grow">
            {state.routes.map((route, index) => {
              const label = getLabel(route.key, route.name);
              const isFocused = state.index === index;

              return (
                <NavItem
                  key={route.key}
                  placement="sidebar"
                  active={isFocused}
                  label={label}
                  onPress={() => navigation.navigate(route.name)}
                />
              );
            })}
          </Stack>
        </Stack>
      </NavContainer>
    );
  }

  return (
    <NavContainer placement="bottom">
      {state.routes.map((route, index) => {
        const label = getLabel(route.key, route.name);
        const isFocused = state.index === index;
        const iconName = getIconName(route.name, isFocused);
        const iconColor = isFocused ? colors.accent : colors.ink;

        return (
          <NavItem
            key={route.key}
            placement="bottom"
            active={isFocused}
            label={label}
            icon={
              iconName ? (
                <Ionicons name={iconName} size={iconSize} color={iconColor} />
              ) : null
            }
            onPress={() => navigation.navigate(route.name)}
          />
        );
      })}
    </NavContainer>
  );
}
