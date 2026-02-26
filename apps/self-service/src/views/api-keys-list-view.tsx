import React, { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Card, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import type { ApiKeyBackendApiKey } from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

type ApiKeysListViewProps = {
  items?: ApiKeyBackendApiKey[];
  isLoading?: boolean;
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

export function ApiKeysListView({
  items = [],
  isLoading = false,
  onBack,
  onCreate,
  onCopy,
}: ApiKeysListViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const resetTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCopy = useCallback(
    (id: string, value: string) => {
      onCopy(value);
      setCopiedIds((prev) => new Set(prev).add(id));
      if (resetTimers.current.has(id)) {
        clearTimeout(resetTimers.current.get(id)!);
      }
      resetTimers.current.set(
        id,
        setTimeout(() => {
          setCopiedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 1800)
      );
    },
    [onCopy]
  );

  const displayItems = items;

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack direction="row" align="center" justify="between" width="full">
          <Stack direction="row" align="center" gap="sm">
            <Button
              variant="ghost"
              size="iconSm"
              onPress={onBack}
              accessibilityLabel={t('apiKeys.back')}>
              <Ionicons name="arrow-back" size={iconSize} color={colors.ink} />
            </Button>
            <Heading tone="title">{t('apiKeys.title')}</Heading>
          </Stack>
          <Button
            variant="primary"
            size="icon"
            shape="circle"
            onPress={onCreate}
            accessibilityLabel={t('apiKeys.new')}>
            <Ionicons name="add" size={iconSize} color={colors.surface} />
          </Button>
        </Stack>

        <Text intent="body">{t('apiKeys.subtitle')}</Text>

        <Stack gap="md">
          {isLoading && (
            <Card size="md">
              <Stack align="center" justify="center">
                <Text intent="caption">{t('apiKeys.loading')}</Text>
              </Stack>
            </Card>
          )}

          {!isLoading && displayItems.length === 0 && (
            <Card size="md">
              <Stack align="center" justify="center">
                <Text intent="caption">{t('apiKeys.emptyState')}</Text>
              </Stack>
            </Card>
          )}

          {!isLoading &&
            displayItems.map((item) => {
              const createdLabel = t('apiKeys.createdOn', {
                date: formatDate(item.created_at),
              });

              return (
                <Card key={item.id} size="md">
                  <Stack direction="row" align="center" justify="between" width="full">
                    <Stack gap="xs">
                      <Text intent="bodyStrong">{item.key_prefix}...</Text>
                      <Text intent="caption">{createdLabel}</Text>
                    </Stack>
                    <Button
                      variant="ghost"
                      size="icon"
                      shape="circle"
                      onPress={() => handleCopy(item.id, `${item.key_prefix}...`)}
                      accessibilityLabel={t('apiKeys.copy')}>
                      <Ionicons
                        name={copiedIds.has(item.id) ? 'checkmark' : 'copy'}
                        size={listIconSize}
                        color={copiedIds.has(item.id) ? colors.success : colors.primary}
                      />
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
