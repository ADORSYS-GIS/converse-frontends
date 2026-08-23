import React from 'react';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { designTokens, Icon as Feather, NavContainer, NavItem, Stack } from '@lightbridge/ui';
import { usePermissions } from '@lightbridge/hooks';

import { useThemeColors } from '../hooks/use-theme-colors';
import { tabRouteIcons, tabRoutes } from './tab-routes';
import { useShellTier } from './use-shell-tier';

/**
 * The ADR 0008 nav spine's left column: a persistent floating panel from the `compact` tier up
 * through `full` (Decision 3's responsive table), collapsing to bottom navigation only at the
 * `guardRail` tier (`<600`, unsupported). Renders the `tabRoutes` spine
 * (`Overview · Api-Keys · Manage · Admin`) — `Admin` only for a caller holding `budget:review`
 * (the existing admin-only permission from `packages/hooks/src/rbac.ts` — see `tab-routes.ts`'s
 * doc comment for why that's an equivalent, reusable stand-in for "holds the `lightbridge-admin`
 * role" without a second gating mechanism).
 */
export function ResponsiveTabBar({ state, descriptors, navigation }: Readonly<BottomTabBarProps>) {
  const tier = useShellTier();
  const colors = useThemeColors();
  const { has } = usePermissions();

  // A gated route (today, only `admin`) is skipped — rather than filtered out of
  // `state.routes` — so every other route's original index stays aligned with
  // `state.index` for focus highlighting (same reasoning the old Grafana-gated
  // Usage tab used before ADR 0008 moved usage off the nav spine entirely).
  const isHiddenRoute = (routeName: string) => {
    const route = tabRoutes.find((candidate) => candidate.name === routeName);
    return Boolean(route?.requiredPermission && !has(route.requiredPermission));
  };

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

  if (tier !== 'guardRail') {
    return (
      <NavContainer placement="sidebar" testID="shell-left-panel-floating">
        <Stack gap="sm" align="center">
          {state.routes.map((route, index) => {
            if (isHiddenRoute(route.name)) {
              return null;
            }
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
    <NavContainer placement="bottom" testID="shell-bottom-nav">
      {state.routes.map((route, index) => {
        if (isHiddenRoute(route.name)) {
          return null;
        }
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
