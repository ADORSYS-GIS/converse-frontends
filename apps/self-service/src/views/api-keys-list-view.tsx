import React from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  ListRow,
  PageHeader,
  Pagination,
  Scroll,
  Stack,
  Text,
} from '@lightbridge/ui';
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
  onRevoke: (id: string, name: string) => void;
  onRotate: (id: string, name: string) => void;
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
  onRevoke,
  onRotate,
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
      <PageHeader
        title={t('apiKeys.title')}
        leading={
          <Button
            variant="ghost"
            size="iconSm"
            onPress={onBack}
            accessibilityLabel={t('apiKeys.back')}>
            <Ionicons name="arrow-back" size={designTokens.icon.nav} color={colors.ink} />
          </Button>
        }
        trailing={
          <Button
            variant="primary"
            size="icon"
            shape="circle"
            onPress={onCreate}
            accessibilityLabel={t('apiKeys.new')}
            style={{ width: 36, height: 36 }}>
            <Ionicons name="add" size={designTokens.icon.nav} color={colors.surface} />
          </Button>
        }
      />

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
                          variant={isSelected ? 'brandSoft' : 'neutral'}
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
                          variant={isSelected ? 'brandSoft' : 'neutral'}
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
                <Button
                  variant="primary"
                  size="sm"
                  onPress={onCreate}
                  disabled={!selectedProjectId}
                  accessibilityLabel={t('apiKeys.new')}>
                  {t('apiKeys.new')}
                </Button>
              }
            />
          </Card>

          <Stack gap="md">
            {isLoading && (
              <Card size="md">
                <EmptyState title={t('apiKeys.loading')} />
              </Card>
            )}

            {!isLoading && displayItems.length === 0 && (
              <Card size="md">
                <EmptyState
                  icon={
                    <Ionicons name="key-outline" size={28} color={colors.subtle} />
                  }
                  title={t('apiKeys.emptyState')}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={onCreate}
                      disabled={!selectedProjectId}
                      accessibilityLabel={t('apiKeys.new')}>
                      {t('apiKeys.new')}
                    </Button>
                  }
                />
              </Card>
            )}

            {!isLoading &&
              displayItems.map((item) => {
                const createdLabel = t('apiKeys.createdOn', {
                  date: formatDate(item.created_at),
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
                        subtitle={t('apiKeys.keyPrefix', { prefix: item.key_prefix })}
                        trailing={
                          <Button
                            variant="ghost"
                            onPress={() => onDelete(item.id, item.name)}
                            accessibilityLabel={t('apiKeys.deleteNamed', { name: item.name })}
                            style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </Button>
                        }
                      />

                      <Divider tone="muted" />

                      {/* Two discrete actions — a segmented control implies a
                          persistent selection, which these aren't. Rotate is
                          neutral; Revoke is destructive (error-tinted label). */}
                      <Stack direction="row" gap="sm" width="full">
                        <Button
                          variant="neutral"
                          size="sm"
                          disabled={!isActive}
                          onPress={() => onRotate(item.id, item.name)}
                          accessibilityLabel={t('apiKeys.rotateNamed', { name: item.name })}
                          style={{ flex: 1 }}>
                          {t('apiKeys.rotate')}
                        </Button>
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
                      </Stack>

                      <Divider tone="muted" />

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

          <Callout
            tone="warning"
            icon={
              <Ionicons
                name="shield-checkmark"
                size={designTokens.icon.action}
                color={colors.secondary}
              />
            }>
            {t('apiKeys.securityNote')}
          </Callout>
        </Stack>
      </Scroll>

      <Pagination
        page={page}
        canPrev={canPrev}
        hasMore={hasMore}
        onPrev={onPrev}
        onNext={onNext}
        pageLabel={t('common.page', { defaultValue: 'Page' })}
        previousLabel={t('common.previous', { defaultValue: 'Previous' })}
        nextLabel={t('common.next', { defaultValue: 'Next' })}
        prevIcon={<Ionicons name="chevron-back" size={16} color={colors.ink} />}
        nextIcon={<Ionicons name="chevron-forward" size={16} color={colors.ink} />}
      />
    </Div>
  );
}
