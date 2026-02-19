import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ResponsiveTabBar } from '../../navigation/responsive-tab-bar';
import { useIsDesktop } from '../../navigation/use-is-desktop';

export default function TabsLayout() {
  const isDesktop = useIsDesktop();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: isDesktop ? { paddingLeft: 256 } : undefined,
      }}
      tabBar={(props) => <ResponsiveTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="api-keys" options={{ title: t('nav.apiKeys') }} />
      <Tabs.Screen name="api-key-editor" options={{ title: t('nav.apiKeyEditor') }} />
      <Tabs.Screen name="usage" options={{ title: t('nav.usage') }} />
    </Tabs>
  );
}
