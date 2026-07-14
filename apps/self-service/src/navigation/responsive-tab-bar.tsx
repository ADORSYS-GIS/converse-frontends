import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { designTokens, Icon as Feather, NavContainer, NavItem, Stack } from '@lightbridge/ui';

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

  const getIconName = (routeName: string) => tabRouteIcons[routeName] ?? null;

  if (isDesktop) {
    return (
      <NavContainer placement="sidebar">
        <Stack gap="sm" align="center">
          {state.routes.map((route, index) => {
            const label = getLabel(route.key, route.name);
            const isFocused = state.index === index;
            const iconName = getIconName(route.name);
            const iconColor = isFocused ? colors.surface : colors.soft;

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
                    <Feather name={iconName} size={designTokens.icon.rail} color={iconColor} />
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
        const iconName = getIconName(route.name);
        const iconColor = isFocused ? colors.primary : colors.subtle;

        return (
          <NavItem
            key={route.key}
            placement="bottom"
            active={isFocused}
            label={label}
            showLabel={true}
            accessibilityLabel={label}
            icon={
              iconName ? (
                <Feather name={iconName} size={designTokens.icon.nav} color={iconColor} />
              ) : null
            }
            onPress={() => navigation.navigate(route.name)}
          />
        );
      })}
    </NavContainer>
  );
}
