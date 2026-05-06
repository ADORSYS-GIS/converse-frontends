import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { designTokens, NavContainer, NavItem, Stack } from '@lightbridge/ui';

import { getThemeColors } from '../theme/theme-colors';
import { tabRouteIcons } from './tab-routes';
import { useIsDesktop } from './use-is-desktop';

export function ResponsiveTabBar({ state, descriptors, navigation }: Readonly<BottomTabBarProps>) {
  const isDesktop = useIsDesktop();
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
    const icon = tabRouteIcons[routeName];
    if (!icon) {
      return null;
    }

    return focused ? icon.active : icon.inactive;
  };

  if (isDesktop) {
    return (
      <NavContainer placement="sidebar">
        <Stack gap="sm" align="center">
          {state.routes.map((route, index) => {
            const label = getLabel(route.key, route.name);
            const isFocused = state.index === index;
            const iconName = getIconName(route.name, isFocused);
            const iconColor = isFocused ? colors.surface : colors.subtle;

            return (
              <NavItem
                key={route.key}
                placement="sidebar"
                active={isFocused}
                label={label}
                showLabel={false}
                accessibilityLabel={label}
                icon={
                  iconName ? (
                    <Ionicons name={iconName} size={designTokens.icon.nav} color={iconColor} />
                  ) : null
                }
                onPress={() => navigation.navigate(route.name)}
              />
            );
          })}
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
        const iconColor = isFocused ? colors.primary : colors.subtle;

        return (
          <NavItem
            key={route.key}
            placement="bottom"
            active={isFocused}
            label={label}
            showLabel={false}
            accessibilityLabel={label}
            icon={
              iconName ? (
                <Ionicons name={iconName} size={designTokens.icon.nav} color={iconColor} />
              ) : null
            }
            onPress={() => navigation.navigate(route.name)}
          />
        );
      })}
    </NavContainer>
  );
}
