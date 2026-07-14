import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import {
  Badge,
  Button,
  Callout,
  Card,
  designTokens,
  Div,
  Divider,
  EmptyState,
  Icon as Feather,
  ListRow,
  PageHeader,
  Scroll,
  Skeleton,
  Stack,
  Text,
} from '@lightbridge/ui';
import type {
  ApiKeyBackendAccount,
  ApiKeyBackendApiKey,
  ApiKeyBackendProject,
} from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

const i18nLocaleMap: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

const getLocaleForDate = (lang: string): string => i18nLocaleMap[lang] ?? lang;

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
  onRevoke: (id: string, name: string) => void;
  onRotate: (id: string, name: string) => void;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  canCreate?: boolean;
  canDelete?: boolean;
  canRevoke?: boolean;
  canRotate?: boolean;
};

export const formatDate = (value: string, locale?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale ?? 'en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export const formatNullableDate = (value?: string | null, locale?: string) => {
  if (!value) {
    return null;
  }

  return formatDate(value, locale);
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
  onRevoke,
  onRotate,
  onSelectAccount,
  onSelectProject,
  canCreate = true,
  canDelete = true,
  canRevoke = true,
  canRotate = true,
}: Readonly<ApiKeysListViewProps>) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const dateLocale = getLocaleForDate(i18n.language);

  const displayItems = items;
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      <PageHeader
        title={t('apiKeys.title')}
        leading={
          <Button
            variant="ghost"
            size="iconSm"
            onPress={onBack}
            accessibilityLabel={t('apiKeys.back')}>
            <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
          </Button>
        }
        trailing={
          canCreate ? (
            <Button
              variant="primary"
              size="icon"
              shape="circle"
              onPress={onCreate}
              accessibilityLabel={t('apiKeys.new')}
              style={{ width: 36, height: 36 }}>
              <Feather name="plus" size={designTokens.icon.nav} color={colors.surface} />
            </Button>
          ) : undefined
        }
      />

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
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

              <Divider tone="muted" />

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
            <ListRow
              title={selectedProject?.name ?? t('apiKeys.noProjectSelected')}
              subtitle={
                selectedProject
                  ? t('apiKeys.projectMetadata', {
                      plan: selectedProject.billing_plan,
                      models: selectedProject.allowed_models?.length ?? 0,
                    })
                  : t('apiKeys.projectRequired')
              }
              trailing={
                canCreate ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={onCreate}
                    disabled={!selectedProjectId}
                    accessibilityLabel={t('apiKeys.new')}>
                    {t('apiKeys.new')}
                  </Button>
                ) : undefined
              }
            />
          </Card>

          <Stack gap="md">
            {isLoading &&
              [0, 1].map((key) => (
                <Card key={key} size="md">
                  <Stack gap="md">
                    <Stack direction="row" align="center" gap="sm">
                      <Skeleton width="45%" height={16} />
                      <Skeleton width={56} height={20} rounded="full" />
                    </Stack>
                    <Skeleton width="65%" height={12} />
                    <Stack direction="row" gap="sm" width="full">
                      <Skeleton height={36} rounded="xl" style={{ flex: 1 }} />
                      <Skeleton height={36} rounded="xl" style={{ flex: 1 }} />
                    </Stack>
                  </Stack>
                </Card>
              ))}

            {!isLoading && displayItems.length === 0 && (
              <Card size="md">
                <EmptyState
                  icon={
                    <Feather name="key" size={28} color={colors.subtle} />
                  }
                  title={t('apiKeys.emptyState')}
                  action={
                    canCreate ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={onCreate}
                        disabled={!selectedProjectId}
                        accessibilityLabel={t('apiKeys.new')}>
                        {t('apiKeys.new')}
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            )}

            {!isLoading &&
              displayItems.map((item) => {
                const createdLabel = t('apiKeys.createdOn', {
                  date: formatDate(item.created_at, dateLocale),
                });
                const isActive = item.status === 'active';

                return (
                  <Card key={item.id} size="md">
                    <Stack gap="md">
                      <ListRow
                        title={
                          <Stack direction="row" align="center" gap="sm">
                            <Text
                              intent="bodyStrong"
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={{ flexShrink: 1 }}>
                              {item.name}
                            </Text>
                            <Badge
                              tone={isActive ? 'success' : 'error'}
                              accessibilityLabel={t(`apiKeys.status.${item.status}`)}>
                              {t(`apiKeys.status.${item.status}`)}
                            </Badge>
                          </Stack>
                        }
                        subtitle={
                          <Text intent="caption">
                            {t('apiKeys.keyPrefixLabel')}{' '}
                            <Text intent="caption" mono>
                              {item.key_prefix}
                            </Text>
                          </Text>
                        }
                        trailing={
                          canDelete ? (
                            <Button
                              variant="ghost"
                              onPress={() => onDelete(item.id, item.name)}
                              accessibilityLabel={t('apiKeys.deleteNamed', { name: item.name })}
                              style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Feather name="trash-2" size={18} color={colors.error} />
                            </Button>
                          ) : undefined
                        }
                      />

                      {/* Two discrete actions — a segmented control implies a
                          persistent selection, which these aren't. Rotate is
                          neutral; Revoke is destructive (error-tinted label). */}
                      {canRotate || canRevoke ? (
                        <Stack direction="row" gap="sm" width="full">
                          {canRotate ? (
                            <Button
                              variant="neutral"
                              size="sm"
                              disabled={!isActive}
                              onPress={() => onRotate(item.id, item.name)}
                              accessibilityLabel={t('apiKeys.rotateNamed', { name: item.name })}
                              style={{ flex: 1 }}>
                              {t('apiKeys.rotate')}
                            </Button>
                          ) : null}
                          {canRevoke ? (
                            <Button
                              variant="neutral"
                              size="sm"
                              disabled={!isActive}
                              onPress={() => onRevoke(item.id, item.name)}
                              accessibilityLabel={t('apiKeys.revokeNamed', { name: item.name })}
                              textProps={{ style: { color: colors.error } }}
                              style={{ flex: 1 }}>
                              {t('apiKeys.revoke')}
                            </Button>
                          ) : null}
                        </Stack>
                      ) : null}

                      <Stack direction="row" gap="md" wrap="wrap" width="full">
                        <Text intent="caption">{createdLabel}</Text>
                        <Text intent="caption">
                          {item.last_used_at
                            ? t('apiKeys.lastUsed', {
                                date: formatNullableDate(item.last_used_at, dateLocale),
                              })
                            : t('apiKeys.neverUsed')}
                        </Text>
                        {item.expires_at ? (
                          <Text intent="caption">
                            {t('apiKeys.expiresOn', {
                              date: formatNullableDate(item.expires_at, dateLocale),
                            })}
                          </Text>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
          </Stack>

          <Callout
            tone="warning"
            icon={
              <Feather
                name="shield"
                size={designTokens.icon.action}
                color={colors.secondary}
              />
            }>
            {t('apiKeys.securityNote')}
          </Callout>
        </Stack>
      </Scroll>
    </Div>
  );
}
