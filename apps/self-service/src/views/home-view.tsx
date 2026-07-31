import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import {
  Button,
  Card,
  designTokens,
  Div,
  Divider,
  Heading,
  Icon as Feather,
  ListRow,
  Scroll,
  Skeleton,
  Stack,
  Text,
} from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type HomeViewProps = {
  userName?: string | null;
  accountLabel?: string | null;
  activeProjectName?: string | null;
  activeProjectPlan?: string | null;
  onNewToken: () => void;
  onManageKeys: () => void;
  onSettings: () => void;
  onSupport: () => void;
  isSigningOut?: boolean;
  onLogout: () => void;
  canCreateKey?: boolean;
};

export function HomeView({
  userName,
  accountLabel,
  activeProjectName,
  activeProjectPlan,
  onNewToken,
  onManageKeys,
  onSettings,
  onSupport,
  isSigningOut,
  onLogout,
  canCreateKey = true,
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
            {accountLabel ? (
              <Text intent="caption" numberOfLines={1} ellipsizeMode="tail">
                {t('home.accountContext', { account: accountLabel })}
              </Text>
            ) : (
              <Skeleton width={160} height={12} />
            )}
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
            <Feather name="log-out" size={designTokens.icon.nav} color={colors.surface} />
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
            {canCreateKey ? (
              <Stack direction="row" gap="sm" wrap="wrap">
                <Button variant="primary" size="sm" onPress={onNewToken}>
                  {t('home.quickActions.newToken')}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </Card>

        <Card size="sm">
          <Stack gap="sm">
            <Text intent="eyebrow">{t('home.quickActions.title')}</Text>
            <ListRow
              onPress={onManageKeys}
              pad="sm"
              rounded="md"
              leading={
                <Div tone="brandSoft" rounded="xl" size="iconMd" align="center" justify="center">
                  <Feather name="key" size={designTokens.icon.action} color={colors.primary} />
                </Div>
              }
              title={t('home.quickActions.manageKeys')}
              trailing={<Feather name="chevron-right" size={18} color={colors.subtle} />}
            />
            <Divider tone="muted" />
            <ListRow
              onPress={onSettings}
              pad="sm"
              rounded="md"
              leading={
                <Div tone="accentSoft" rounded="xl" size="iconMd" align="center" justify="center">
                  <Feather name="settings" size={designTokens.icon.action} color={colors.accent} />
                </Div>
              }
              title={t('home.quickActions.settings')}
              trailing={<Feather name="chevron-right" size={18} color={colors.subtle} />}
            />
          </Stack>
        </Card>

        <Card size="sm">
          <Stack gap="md">
            <Text intent="eyebrow">{t('home.gettingStarted.title')}</Text>
            <Stack gap="sm">
              <Stack direction="row" align="center" gap="sm">
                <Feather name="key" size={designTokens.icon.action} color={colors.primary} />
                <Text intent="body">{t('home.gettingStarted.createKey')}</Text>
              </Stack>
              <Stack direction="row" align="center" gap="sm">
                <Feather name="settings" size={designTokens.icon.action} color={colors.primary} />
                <Text intent="body">{t('home.gettingStarted.manageProject')}</Text>
              </Stack>
              <Stack direction="row" align="center" gap="sm">
                <Feather name="user" size={designTokens.icon.action} color={colors.primary} />
                <Text intent="body">{t('home.gettingStarted.reviewSettings')}</Text>
              </Stack>
            </Stack>
          </Stack>
        </Card>

        <Card size="sm" accessibilityRole="button" onPress={onSupport}>
          <Stack direction="row" align="center" gap="sm">
            <Div tone="successSoft" rounded="xl" size="iconMd" align="center" justify="center">
              <Feather name="help-circle" size={designTokens.icon.action} color={colors.success} />
            </Div>
            <Text intent="bodyStrong" style={{ flex: 1 }}>
              {t('home.quickActions.support')}
            </Text>
            <Feather name="chevron-right" size={18} color={colors.subtle} />
          </Stack>
        </Card>
      </Stack>
    </Scroll>
  );
}
