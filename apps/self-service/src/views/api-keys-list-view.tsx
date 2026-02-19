import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Card, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import type { ApiKey } from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

type ApiKeysListViewProps = {
  items: ApiKey[];
  onBack: () => void;
  onCreate: () => void;
  onCopy: (value: string) => void;
};

const iconSize = 22;
const listIconSize = 20;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export function ApiKeysListView({ items, onBack, onCreate, onCopy }: ApiKeysListViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack direction="row" align="center" justify="between" width="full">
          <Stack direction="row" align="center" gap="sm">
            <Button
              variant="neutral"
              size="icon"
              shape="circle"
              onPress={onBack}
              accessibilityLabel={t('apiKeys.back')}
            >
              <Ionicons name="chevron-back" size={iconSize} color={colors.ink} />
            </Button>
            <Heading tone="title">{t('apiKeys.title')}</Heading>
          </Stack>
          <Button
            variant="primary"
            size="icon"
            shape="circle"
            onPress={onCreate}
            accessibilityLabel={t('apiKeys.new')}
          >
            <Ionicons name="add" size={iconSize} color={colors.surface} />
          </Button>
        </Stack>

        <Text intent="body">{t('apiKeys.subtitle')}</Text>

        <Stack gap="md">
          {items.map((item) => {
            const createdLabel = t('apiKeys.createdOn', {
              date: formatDate(item.createdAt),
            });

            return (
              <Card key={item.id} size="md">
                <Stack direction="row" align="center" justify="between" width="full">
                  <Stack gap="xs">
                    <Text intent="bodyStrong">{item.key}</Text>
                    <Text intent="caption">{createdLabel}</Text>
                  </Stack>
                  <Button
                    variant="ghost"
                    size="icon"
                    shape="circle"
                    onPress={() => onCopy(item.key)}
                    accessibilityLabel={t('apiKeys.copy')}
                  >
                    <Ionicons name="copy" size={listIconSize} color={colors.primary} />
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </Stack>

        <Div tone="warningSoft" rounded="xl" pad="md" width="full">
          <Stack direction="row" gap="sm" align="start">
            <Ionicons name="shield-checkmark" size={20} color={colors.secondary} />
            <Text intent="warning">{t('apiKeys.securityNote')}</Text>
          </Stack>
        </Div>
      </Stack>
    </Scroll>
  );
}
