import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, designTokens, Div, Heading, Scroll, Stack, Text } from '@lightbridge/ui';
import type {
  ApiKeyBackendAccount,
  ApiKeyBackendApiKey,
  ApiKeyBackendProject,
} from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

type ApiKeysListViewProps = {
  accounts?: ApiKeyBackendAccount[];
  projects?: ApiKeyBackendProject[];
  selectedAccountId?: string;
  selectedProjectId?: string;
  items?: ApiKeyBackendApiKey[];
  isLoading?: boolean;
  onBack: () => void;
  onCreate: () => void;
  onDelete: (id: string, name: string) => void;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
  hasMore: boolean;
  canPrev: boolean;
  page: number;
};

export const formatDate = (value: string) => {
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

export const formatNullableDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return formatDate(value);
};

export function ApiKeysListView({
  accounts = [],
  projects = [],
  selectedAccountId,
  selectedProjectId,
  items = [],
  isLoading = false,
  onBack,
  onCreate,
  onDelete,
  onSelectAccount,
  onSelectProject,
  onNext,
  onPrev,
  hasMore,
  canPrev,
  page,
}: Readonly<ApiKeysListViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const displayItems = items;
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      <Div
        tone="surface"
        width="full"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: designTokens.layout.topBarMinHeight,
          paddingHorizontal: designTokens.spacing.topBarHorizontal,
          paddingVertical: designTokens.spacing.topBarVertical,
          backgroundColor: colors.surface,
        }}>
        <Stack direction="row" align="center" justify="between" width="full">
          <Button
            variant="ghost"
            size="iconSm"
            onPress={onBack}
            accessibilityLabel={t('apiKeys.back')}>
            <Ionicons name="arrow-back" size={designTokens.icon.nav} color={colors.ink} />
          </Button>

          <Heading
            tone="title"
            style={{
              fontSize: designTokens.typography.compactTitle,
              color: colors.ink,
              fontWeight: '700',
            }}>
            {t('apiKeys.title')}
          </Heading>

          <Button
            variant="primary"
            size="icon"
            shape="circle"
            onPress={onCreate}
            accessibilityLabel={t('apiKeys.new')}
            style={{ width: 36, height: 36 }}>
            <Ionicons name="add" size={designTokens.icon.nav} color={colors.surface} />
          </Button>
        </Stack>
      </Div>

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Text intent="eyebrow">{t('apiKeys.scopeEyebrow')}</Text>
            <Text intent="body">{t('apiKeys.subtitle')}</Text>
          </Stack>

          <Card size="sm">
            <Stack gap="md">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('apiKeys.accountsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {accounts.length === 0 ? (
                    <Text intent="caption">{t('apiKeys.noAccounts')}</Text>
                  ) : (
                    accounts.map((account) => {
                      const isSelected = account.id === selectedAccountId;

                      return (
                        <Button
                          key={account.id}
                          variant={isSelected ? 'primary' : 'neutral'}
                          size="sm"
                          onPress={() => onSelectAccount(account.id)}
                          accessibilityLabel={t('apiKeys.selectAccount', {
                            account: account.billing_identity,
                          })}>
                          {account.billing_identity}
                        </Button>
                      );
                    })
                  )}
                </Stack>
              </Stack>

              <Div tone="muted" height="hairline" width="full" />

              <Stack gap="xs">
                <Text intent="bodyStrong">{t('apiKeys.projectsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {projects.length === 0 ? (
                    <Text intent="caption">{t('apiKeys.noProjects')}</Text>
                  ) : (
                    projects.map((project) => {
                      const isSelected = project.id === selectedProjectId;

                      return (
                        <Button
                          key={project.id}
                          variant={isSelected ? 'primary' : 'neutral'}
                          size="sm"
                          onPress={() => onSelectProject(project.id)}
                          accessibilityLabel={t('apiKeys.selectProject', {
                            project: project.name,
                          })}>
                          {project.name}
                        </Button>
                      );
                    })
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card size="sm">
            <Stack direction="row" align="center" justify="between" width="full" gap="md">
              <Stack gap="xs" style={{ flex: 1 }}>
                <Text intent="eyebrow">{t('apiKeys.currentProject')}</Text>
                <Text intent="bodyStrong" numberOfLines={1} ellipsizeMode="tail">
                  {selectedProject?.name ?? t('apiKeys.noProjectSelected')}
                </Text>
                <Text intent="caption" numberOfLines={1} ellipsizeMode="tail">
                  {selectedProject
                    ? t('apiKeys.projectMetadata', {
                        plan: selectedProject.billing_plan,
                        models: selectedProject.allowed_models?.length ?? 0,
                      })
                    : t('apiKeys.projectRequired')}
                </Text>
              </Stack>
              <Button
                variant="primary"
                size="sm"
                onPress={onCreate}
                disabled={!selectedProjectId}
                accessibilityLabel={t('apiKeys.new')}>
                {t('apiKeys.new')}
              </Button>
            </Stack>
          </Card>

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
                    <Stack gap="md">
                      <Stack direction="row" align="center" justify="between" width="full" gap="md">
                        <Stack
                          gap="xs"
                          style={{
                            flex: 1,
                            paddingRight: designTokens.spacing.inlineXs,
                            overflow: 'hidden',
                          }}>
                          <Stack direction="row" align="center" gap="sm">
                            <Text intent="bodyStrong" numberOfLines={1} ellipsizeMode="tail">
                              {item.name}
                            </Text>
                            <Div
                              tone={item.status === 'active' ? 'successSoft' : 'errorSoft'}
                              rounded="full"
                              pad="sm"
                              accessibilityLabel={t(`apiKeys.status.${item.status}`)}>
                              <Text intent={item.status === 'active' ? 'caption' : 'warning'}>
                                {t(`apiKeys.status.${item.status}`)}
                              </Text>
                            </Div>
                          </Stack>
                          <Text intent="caption" numberOfLines={1}>
                            {t('apiKeys.keyPrefix', { prefix: item.key_prefix })}
                          </Text>
                        </Stack>
                        <Button
                          variant="ghost"
                          onPress={() => onDelete(item.id, item.name)}
                          accessibilityLabel={t('apiKeys.deleteNamed', { name: item.name })}
                          style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </Button>
                      </Stack>

                      <Div tone="muted" height="hairline" width="full" />

                      <Stack direction="row" gap="md" wrap="wrap" width="full">
                        <Text intent="caption">{createdLabel}</Text>
                        <Text intent="caption">
                          {item.last_used_at
                            ? t('apiKeys.lastUsed', {
                                date: formatNullableDate(item.last_used_at),
                              })
                            : t('apiKeys.neverUsed')}
                        </Text>
                        {item.expires_at ? (
                          <Text intent="caption">
                            {t('apiKeys.expiresOn', {
                              date: formatNullableDate(item.expires_at),
                            })}
                          </Text>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
          </Stack>

          <Div tone="warningSoft" rounded="xl" pad="md" width="full">
            <Stack direction="row" gap="sm" align="start">
              <Ionicons
                name="shield-checkmark"
                size={designTokens.icon.action}
                color={colors.secondary}
              />
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
          paddingHorizontal: designTokens.spacing.topBarHorizontal,
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
