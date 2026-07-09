import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, designTokens, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

function getServiceStatusTone(status: ServiceStatus): 'success' | 'error' | 'muted' {
  if (status === 'healthy') return 'success';
  if (status === 'unhealthy') return 'error';
  return 'muted';
}

export type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown';

export type ServiceInfo = {
  key: string;
  name: string;
  version: string;
  status: ServiceStatus;
};
type HomeViewProps = {
  userName?: string | null;
  accountBillingIdentity?: string | null;
  accountCount: number;
  projectCount: number;
  activeProjectName?: string | null;
  activeProjectPlan?: string | null;
  activeApiKeyCount: number;
  usedRequests: number;
  startDate: string;
  services?: ServiceInfo[];
  onNewToken: () => void;
  onEndpoints: () => void;
  onUsageLogs: () => void;
  onSupport: () => void;
  isSigningOut?: boolean;
  onLogout: () => void;
};

export function HomeView({
  userName,
  accountBillingIdentity,
  accountCount,
  projectCount,
  activeProjectName,
  activeProjectPlan,
  activeApiKeyCount,
  usedRequests,
  startDate,
  services: servicesProp,
  onNewToken,
  onEndpoints,
  onUsageLogs,
  onSupport,
  isSigningOut,
  onLogout,
}: Readonly<HomeViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const displayName = userName || t('home.defaultName');
  const projectName = activeProjectName || t('home.noProject');
  const projectPlan = activeProjectPlan || t('home.noPlan');

  const summaryLabel = t('home.usageCostSummary', {
    used: usedRequests.toFixed(2),
    startDate,
  });

  const quickActions = [
    {
      key: 'new-token',
      label: t('home.quickActions.newToken'),
      icon: <Ionicons name="add" size={designTokens.icon.action} color={colors.primary} />,
      tone: 'brandSoft' as const,
      onPress: onNewToken,
    },
    {
      key: 'endpoints',
      label: t('home.quickActions.endpoints'),
      icon: <Ionicons name="cube" size={designTokens.icon.action} color={colors.accent} />,
      tone: 'accentSoft' as const,
      onPress: onEndpoints,
    },
    {
      key: 'usage-logs',
      label: t('home.quickActions.usageLogs'),
      icon: <Ionicons name="receipt" size={designTokens.icon.action} color={colors.secondary} />,
      tone: 'warningSoft' as const,
      onPress: onUsageLogs,
    },
    {
      key: 'support',
      label: t('home.quickActions.support'),
      icon: <Ionicons name="help-circle" size={designTokens.icon.action} color={colors.success} />,
      tone: 'successSoft' as const,
      onPress: onSupport,
    },
  ];

  const scopeMetrics = [
    {
      key: 'accounts',
      label: t('home.scope.accounts'),
      value: accountCount.toLocaleString(),
      icon: <Ionicons name="business" size={designTokens.icon.action} color={colors.primary} />,
      tone: 'brandSoft' as const,
    },
    {
      key: 'projects',
      label: t('home.scope.projects'),
      value: projectCount.toLocaleString(),
      icon: <Ionicons name="folder" size={designTokens.icon.action} color={colors.accent} />,
      tone: 'accentSoft' as const,
    },
    {
      key: 'api-keys',
      label: t('home.scope.apiKeys'),
      value: activeApiKeyCount.toLocaleString(),
      icon: <Ionicons name="key" size={designTokens.icon.action} color={colors.success} />,
      tone: 'successSoft' as const,
    },
  ];

  // Use provided services or fallback to defaults if none provided
  const services =
    servicesProp && servicesProp.length > 0
      ? servicesProp
      : [
          {
            key: 'analytics-engine',
            name: t('home.services.analyticsEngine'),
            version: t('home.version', { version: '1.8.0' }),
            status: 'unknown' as ServiceStatus,
          },
        ];

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

        <Stack direction="row" wrap="wrap" gap="md" width="full">
          {scopeMetrics.map((metric) => (
            <Card key={metric.key} size="sm" style={{ flexBasis: '30%', flexGrow: 1 }}>
              <Stack gap="sm">
                <Div
                  tone={metric.tone}
                  rounded="full"
                  size="iconMd"
                  align="center"
                  justify="center">
                  {metric.icon}
                </Div>
                <Stack gap="xs">
                  <Text intent="caption">{metric.label}</Text>
                  <Text intent="value">{metric.value}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
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
            <Text intent="body">{t('home.activeProject.description')}</Text>
            <Stack direction="row" gap="sm" wrap="wrap">
              <Button variant="primary" size="sm" onPress={onNewToken}>
                {t('home.quickActions.newToken')}
              </Button>
              <Button variant="neutral" size="sm" onPress={onUsageLogs}>
                {t('home.quickActions.usageLogs')}
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Card size="md">
          <Stack direction="row" justify="between" align="start" width="full">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text intent="eyebrow">{t('home.currentUsage')}</Text>
              <Text intent="display">${usedRequests.toFixed(2)}</Text>
              <Text intent="caption">{summaryLabel}</Text>
            </Stack>
            <Div tone="brandSoft" rounded="full" size="iconMd" align="center" justify="center">
              <Ionicons name="stats-chart" size={designTokens.icon.action} color={colors.primary} />
            </Div>
          </Stack>
        </Card>

        <Stack gap="md">
          <Text intent="eyebrow">{t('home.quickActions.title')}</Text>
          <Stack direction="row" wrap="wrap" gap="md" width="full">
            {quickActions.map((action) => (
              <Card
                key={action.key}
                size="sm"
                accessibilityRole="button"
                onPress={action.onPress}
                style={{ flexBasis: '47%', flexGrow: 1, minHeight: 116 }}>
                <Stack gap="sm" justify="between" style={{ flex: 1 }}>
                  <Div
                    tone={action.tone}
                    rounded="xl"
                    size="iconLg"
                    align="center"
                    justify="center">
                    {action.icon}
                  </Div>
                  <Text intent="bodyStrong">{action.label}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>

        <Stack gap="md">
          <Text intent="eyebrow">{t('home.activeServices.title')}</Text>
          <Card size="sm">
            <Stack gap="sm">
              {services.map((service, index) => (
                <Stack key={service.key} gap="sm">
                  <Stack direction="row" justify="between" align="center" width="full">
                    <Stack direction="row" align="center" gap="sm">
                      <Div tone={getServiceStatusTone(service.status)} rounded="full" size="dot" />
                      <Text intent="bodyStrong">{service.name}</Text>
                    </Stack>
                    <Text intent="caption">{service.version}</Text>
                  </Stack>
                  {index < services.length - 1 ? (
                    <Div tone="muted" height="hairline" width="full" />
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </Scroll>
  );
}
