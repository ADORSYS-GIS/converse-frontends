import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import { designTokens } from '@lightbridge/ui';

import { ConsoleHeader } from '../../navigation/console-header';
import { ResponsiveTabBar } from '../../navigation/responsive-tab-bar';
import { tabRoutes } from '../../navigation/tab-routes';
import { hasPersistentLeftPanel, useShellTier } from '../../navigation/use-shell-tier';

export default function TabsLayout() {
  const tier = useShellTier();
  const { t } = useTranslation();
  // The left nav panel persists from `compact` up through `full` (ADR 0008 Decision 3's
  // responsive table) — it only collapses to bottom navigation at `guardRail`, so the scene
  // content only needs the nav-rail inset for those two tiers, not just `full` as before.
  const isPersistentLeftPanel = hasPersistentLeftPanel(tier);

  return (
    <View style={{ flex: 1 }}>
      <ConsoleHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: isPersistentLeftPanel
            ? { paddingLeft: designTokens.layout.navRailWidth }
            : undefined,
        }}
        tabBar={(props) => <ResponsiveTabBar {...props} />}>
        {tabRoutes.map((route) => (
          <Tabs.Screen key={route.name} name={route.name} options={{ title: t(route.titleKey) }} />
        ))}
      </Tabs>
    </View>
  );
}
