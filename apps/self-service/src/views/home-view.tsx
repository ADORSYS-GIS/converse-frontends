import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, designTokens, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type HomeViewProps = {
  userName?: string | null;
  accountBillingIdentity?: string | null;
  activeProjectName?: string | null;
  activeProjectPlan?: string | null;
  onNewToken: () => void;
  onSupport: () => void;
  isSigningOut?: boolean;
  onLogout: () => void;
};

export function HomeView({
  userName,
  accountBillingIdentity,
  activeProjectName,
  activeProjectPlan,
  onNewToken,
  onSupport,
  isSigningOut,
  onLogout,
}: Readonly<HomeViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const displayName = userName || t('home.defaultName');
  const projectName = activeProjectName || t('home.noProject');
  const projectPlan = activeProjectPlan || t('home.noPlan');

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack direction="row" justify="between" align="center" width="full">
          <Stack gap="xs">
            <Text intent="eyebrow">{t('home.controlPlane')}</Text>
            <Heading tone="title">{t('home.greeting', { name: displayName })}</Heading>
            <Text intent="caption" numberOfLines={1} ellipsizeMode="tail">
              {accountBillingIdentity
                ? t('home.accountContext', { account: accountBillingIdentity })
                : t('home.accountPending')}
            </Text>
          </Stack>
          <Div
            tone="brand"
            rounded="full"
            size="iconMd"
            align="center"
            justify="center"
            accessibilityRole="button"
            accessibilityLabel={t('nav.logout')}
            disabled={Boolean(isSigningOut)}
            onPress={onLogout}>
            <Ionicons name="log-out-outline" size={designTokens.icon.nav} color={colors.surface} />
          </Div>
        </Stack>

        <Card size="md">
          <Stack gap="md">
            <Stack direction="row" justify="between" align="center" width="full">
              <Stack gap="xs" style={{ flex: 1 }}>
                <Text intent="eyebrow">{t('home.activeProject.title')}</Text>
                <Text intent="bodyStrong" numberOfLines={1} ellipsizeMode="tail">
                  {projectName}
                </Text>
              </Stack>
              <Div tone="muted" rounded="full" pad="sm">
                <Text intent="caption">{projectPlan}</Text>
              </Div>
            </Stack>
            <Stack direction="row" gap="sm" wrap="wrap">
              <Button variant="primary" size="sm" onPress={onNewToken}>
                {t('home.quickActions.newToken')}
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Card size="sm" accessibilityRole="button" onPress={onSupport}>
          <Stack direction="row" align="center" gap="sm">
            <Div tone="successSoft" rounded="xl" size="iconMd" align="center" justify="center">
              <Ionicons name="help-circle" size={designTokens.icon.action} color={colors.success} />
            </Div>
            <Text intent="bodyStrong" style={{ flex: 1 }}>
              {t('home.quickActions.support')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Stack>
        </Card>
      </Stack>
    </Scroll>
  );
}
