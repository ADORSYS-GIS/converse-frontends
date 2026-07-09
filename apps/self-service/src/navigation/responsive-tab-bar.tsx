import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { designTokens, NavContainer, NavItem, Stack } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';
import { tabRouteIcons } from './tab-routes';
import { useIsDesktop } from './use-is-desktop';

export function ResponsiveTabBar({ state, descriptors, navigation }: Readonly<BottomTabBarProps>) {
  const isDesktop = useIsDesktop();
  const colors = useThemeColors();

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
        <Stack gap="xs" align="stretch">
          {state.routes.map((route, index) => {
            const label = getLabel(route.key, route.name);
            const isFocused = state.index === index;
            const iconName = getIconName(route.name, isFocused);
            // Match the caption colours: filled pill → surface icon, otherwise
            // the same `soft` tone as the label beneath it.
            const iconColor = isFocused ? colors.surface : colors.soft;

            return (
              <NavItem
                key={route.key}
                placement="sidebar"
                active={isFocused}
                label={label}
                showLabel
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
