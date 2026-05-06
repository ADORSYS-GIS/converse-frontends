import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@lightbridge/ui';

import { ResponsiveTabBar } from '../../navigation/responsive-tab-bar';
import { tabRoutes } from '../../navigation/tab-routes';
import { useIsDesktop } from '../../navigation/use-is-desktop';

export default function TabsLayout() {
  const isDesktop = useIsDesktop();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: isDesktop ? { paddingLeft: designTokens.layout.navRailWidth } : undefined,
      }}
      tabBar={(props) => <ResponsiveTabBar {...props} />}>
      {tabRoutes.map((route) => (
        <Tabs.Screen key={route.name} name={route.name} options={{ title: t(route.titleKey) }} />
      ))}
    </Tabs>
  );
}
