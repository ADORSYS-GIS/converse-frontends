import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Card, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import type { ApiKeyBackendApiKey } from '@lightbridge/api-rest';
import { getThemeColors } from '../theme/theme-colors';

type ApiKeysListViewProps = {
  items?: ApiKeyBackendApiKey[];
  isLoading?: boolean;
  onBack: () => void;
  onCreate: () => void;
  onDelete: (id: string, name: string) => void;
  onNext: () => void;
  onPrev: () => void;
  hasMore: boolean;
  canPrev: boolean;
  page: number;
};

const iconSize = 22;

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
  onDelete,
  onNext,
  onPrev,
  hasMore,
  canPrev,
  page,
}: Readonly<ApiKeysListViewProps>) {
  const { t } = useTranslation();
  const colors = useMemo(() => getThemeColors('light'), []);

  const displayItems = items;

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      <Div
        tone="surface"
        width="full"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 58,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.surface,
        }}>
        <Stack direction="row" align="center" justify="between" width="full">
          <Button
            variant="ghost"
            size="iconSm"
            onPress={onBack}
            accessibilityLabel={t('apiKeys.back')}>
            <Ionicons name="arrow-back" size={iconSize} color={colors.ink} />
          </Button>

          <Heading tone="title" style={{ fontSize: 20, color: colors.ink, fontWeight: '700' }}>
            {t('apiKeys.title')}
          </Heading>

          <Button
            variant="primary"
            size="icon"
            shape="circle"
            onPress={onCreate}
            accessibilityLabel={t('apiKeys.new')}
            style={{ width: 36, height: 36 }}>
            <Ionicons name="add" size={iconSize} color={colors.surface} />
          </Button>
        </Stack>
      </Div>

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
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
                        <Text intent="bodyStrong">{item.name}</Text>
                        <Text intent="caption">{createdLabel}</Text>
                      </Stack>
                      <Button
                        variant="ghost"
                        onPress={() => onDelete(item.id, item.name)}
                        style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
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

      <Div
        tone="surface"
        width="full"
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
        }}>
        <Stack direction="row" align="center" justify="between" width="full">
          <Button
            variant="ghost"
            size="sm"
            onPress={onPrev}
            disabled={!canPrev}
            style={{ opacity: canPrev ? 1 : 0.5 }}>
            <Stack direction="row" align="center" gap="xs">
              <Ionicons name="chevron-back" size={16} color={colors.ink} />
              <Text intent="bodyStrong">{t('common.previous', { defaultValue: 'Previous' })}</Text>
            </Stack>
          </Button>

          <Text intent="caption" style={{ fontWeight: '600' }}>
            {t('common.page', { defaultValue: 'Page' })} {page}
          </Text>

          <Button
            variant="ghost"
            size="sm"
            onPress={onNext}
            disabled={!hasMore}
            style={{ opacity: hasMore ? 1 : 0.5 }}>
            <Stack direction="row" align="center" gap="xs">
              <Text intent="bodyStrong">{t('common.next', { defaultValue: 'Next' })}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.ink} />
            </Stack>
          </Button>
        </Stack>
      </Div>
    </Div>
  );
}
