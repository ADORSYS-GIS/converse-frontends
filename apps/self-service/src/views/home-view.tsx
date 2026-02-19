import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';

const quickActionIconSize = 20;
const notificationIconSize = 20;

type HomeViewProps = {
  userName?: string | null;
  usagePercent: number;
  usedRequests: number;
  totalRequests: number;
  onNewToken: () => void;
  onEndpoints: () => void;
  onUsageLogs: () => void;
  onSupport: () => void;
};

export function HomeView({
  userName,
  usagePercent,
  usedRequests,
  totalRequests,
  onNewToken,
  onEndpoints,
  onUsageLogs,
  onSupport,
}: HomeViewProps) {
  const { t } = useTranslation();

  const displayName = userName || t('home.defaultName');
  const clampedPercent = Math.min(Math.max(usagePercent, 0), 100);
  const percentLabel = t('home.usagePercent', {
    percent: clampedPercent.toFixed(1),
  });

  const summaryLabel = t('home.usageSummary', {
    used: usedRequests.toLocaleString(),
    total: totalRequests.toLocaleString(),
  });

  const quickActions = [
    {
      key: 'new-token',
      label: t('home.quickActions.newToken'),
      icon: <Ionicons name="add" size={quickActionIconSize} color="#1d5bff" />,
      tone: 'brandSoft' as const,
      onPress: onNewToken,
    },
    {
      key: 'endpoints',
      label: t('home.quickActions.endpoints'),
      icon: <Ionicons name="cube" size={quickActionIconSize} color="#7c3aed" />,
      tone: 'accentSoft' as const,
      onPress: onEndpoints,
    },
    {
      key: 'usage-logs',
      label: t('home.quickActions.usageLogs'),
      icon: <Ionicons name="receipt" size={quickActionIconSize} color="#f97316" />,
      tone: 'warningSoft' as const,
      onPress: onUsageLogs,
    },
    {
      key: 'support',
      label: t('home.quickActions.support'),
      icon: <Ionicons name="help-circle" size={quickActionIconSize} color="#10b981" />,
      tone: 'successSoft' as const,
      onPress: onSupport,
    },
  ];

  const services = [
    {
      key: 'production-gateway',
      name: t('home.services.productionGateway'),
      version: t('home.version', { version: '2.4.1' }),
    },
    {
      key: 'analytics-engine',
      name: t('home.services.analyticsEngine'),
      version: t('home.version', { version: '1.8.0' }),
    },
  ];

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack direction="row" justify="between" align="center" width="full">
          <Stack gap="xs">
            <Text intent="body">{t('home.welcomeBack')}</Text>
            <Heading tone="title">{t('home.greeting', { name: displayName })}</Heading>
          </Stack>
          <Div
            tone="brandSoft"
            rounded="full"
            size="iconLg"
            align="center"
            justify="center"
          >
            <Ionicons name="notifications" size={notificationIconSize} color="#1d5bff" />
          </Div>
        </Stack>

        <Div tone="brand" rounded="xl" shadow="lg" pad="lg" width="full">
          <Stack gap="md">
            <Stack direction="row" justify="between" align="center" width="full">
              <Text intent="inverseBodyStrong">{t('home.currentUsage')}</Text>
              <Ionicons name="stats-chart" size={18} color="#ffffff" />
            </Stack>

            <Stack gap="xs">
              <Text intent="inverseValue">{percentLabel}</Text>
              <Text intent="inverseCaption">{summaryLabel}</Text>
            </Stack>

            <Div tone="brandSoft" rounded="full" height="xs" width="full">
              <Div
                tone="surface"
                rounded="full"
                height="xs"
                style={{ width: `${clampedPercent}%` }}
              />
            </Div>
          </Stack>
        </Div>

        <Stack gap="md">
          <Text intent="eyebrow">{t('home.quickActions.title')}</Text>
          <Stack direction="row" wrap="wrap" gap="md" width="full">
            {quickActions.map((action) => (
              <Card
                key={action.key}
                size="sm"
                accessibilityRole="button"
                onTouchEnd={action.onPress}
                style={{ width: '48%' }}
              >
                <Stack gap="sm">
                  <Div
                    tone={action.tone}
                    rounded="xl"
                    size="iconLg"
                    align="center"
                    justify="center"
                  >
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
                      <Div tone="success" rounded="full" size="dot" />
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
