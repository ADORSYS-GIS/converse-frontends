import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import {
  Badge,
  Button,
  Callout,
  Card,
  DataCard,
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
import type { Account, ApiKey, Project } from '@lightbridge/hooks';
import {
  EntityPickerField,
  toAccountPickerOptions,
  toProjectPickerOptions,
} from '../components/entity-picker-field';
import { useThemeColors } from '../hooks/use-theme-colors';
import type { DerivedKeyStatus } from '../lib/api-key-expiry';
import { daysUntilExpiry, getDerivedStatus, getExpiryUrgency } from '../lib/api-key-expiry';

const i18nLocaleMap: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

const getLocaleForDate = (lang: string): string => i18nLocaleMap[lang] ?? lang;

type ApiKeysListViewProps = {
  accounts?: Account[];
  projects?: Project[];
  selectedAccountId?: string;
  selectedProjectId?: string;
  items?: ApiKey[];
  isLoading?: boolean;
  onBack: () => void;
  onCreate: () => void;
  onDelete: (id: string, name: string) => void;
  onRevoke: (id: string, name: string) => void;
  onRotate: (id: string, name: string) => void;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  /** Opens the searchable account/project picker sheet — owned by the screen (`usePickerSheet`). */
  onOpenAccountPicker: () => void;
  onOpenProjectPicker: () => void;
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

/** `Badge` tone for the header status pill. `revoked` and `expired` read equally severe (both
 * mean the key can't authenticate right now) -- only the label differs. */
const STATUS_BADGE_TONE: Record<DerivedKeyStatus, 'success' | 'error'> = {
  active: 'success',
  revoked: 'error',
  expired: 'error',
};

/**
 * The footer caption for a key's expiration, escalating to a warning-toned `Badge` once the key
 * is within the "expiring soon" window so it doesn't read as identical to the plain
 * `createdOn`/`lastUsed` captions beside it. Expired keys are already unmistakable via the header
 * status badge (see `STATUS_BADGE_TONE`); this still shows the exact date so "when" is legible,
 * not just "that it happened".
 *
 * Renders nothing for `urgency === 'none'` (no `expiresAt` on record). Every key this app creates
 * or edits now requires a real expiration (standing requirement: "all api-keys created from our
 * system MUST have an expiry date... the UI shall not have a 'no expiry' label"), so this state
 * should only ever be reached for a key that predates that cutover -- there is deliberately no
 * "No expiry"/"Never expires" branch to reintroduce here; omitting the caption is the honest
 * rendering of "this field genuinely has no value on record", not a claim that the key is
 * permanently non-expiring.
 */
function ExpiryCaption({
  expiresAt,
  dateLocale,
}: Readonly<{ expiresAt?: string | null; dateLocale: string }>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const urgency = getExpiryUrgency(expiresAt);

  if (urgency === 'none') {
    return null;
  }

  if (urgency === 'expired') {
    return (
      <Text intent="caption" style={{ color: colors.error }}>
        {t('apiKeys.expiry.expiredOn', { date: formatNullableDate(expiresAt, dateLocale) })}
      </Text>
    );
  }

  if (urgency === 'soon') {
    const days = daysUntilExpiry(expiresAt) ?? 0;
    return (
      <Badge tone="warning">
        {days <= 0
          ? t('apiKeys.expiry.expiresToday')
          : t('apiKeys.expiry.expiresInDays', { count: days })}
      </Badge>
    );
  }

  return (
    <Text intent="caption">
      {t('apiKeys.expiresOn', { date: formatNullableDate(expiresAt, dateLocale) })}
    </Text>
  );
}

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
  onOpenAccountPicker,
  onOpenProjectPicker,
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

  const accountOptions = toAccountPickerOptions(accounts);
  const projectOptions = toProjectPickerOptions(projects, selectedProjectId, colors);

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
              <EntityPickerField
                label={t('apiKeys.accountsLabel')}
                options={accountOptions}
                selectedId={selectedAccountId}
                onSelect={onSelectAccount}
                onOpenPicker={onOpenAccountPicker}
                emptyLabel={t('apiKeys.noAccounts')}
                placeholderLabel={t('picker.selectAccount')}
                triggerAccessibilityLabel={t('picker.selectAccount')}
                optionAccessibilityLabel={(option) =>
                  t('apiKeys.selectAccount', { account: option.label })
                }
                isLoading={isLoading}
              />

              <Divider tone="muted" />

              <EntityPickerField
                label={t('apiKeys.projectsLabel')}
                options={projectOptions}
                selectedId={selectedProjectId}
                onSelect={onSelectProject}
                onOpenPicker={onOpenProjectPicker}
                emptyLabel={t('apiKeys.noProjects')}
                placeholderLabel={t('picker.selectProject')}
                triggerAccessibilityLabel={t('picker.selectProject')}
                optionAccessibilityLabel={(option) =>
                  t('apiKeys.selectProject', { project: option.label })
                }
                isLoading={isLoading}
              />
            </Stack>
          </Card>

          <Card size="sm">
            <ListRow
              title={selectedProject?.name ?? t('apiKeys.noProjectSelected')}
              subtitle={
                selectedProject
                  ? t('apiKeys.projectMetadata', {
                      plan: selectedProject.billingPlan,
                      models: Array.isArray(selectedProject.allowedModels)
                        ? selectedProject.allowedModels.length
                        : 0,
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
                  icon={<Feather name="key" size={28} color={colors.subtle} />}
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
                  date: formatDate(item.createdAt, dateLocale),
                });
                // `isActive` gates the Rotate/Revoke buttons and stays tied to the real backend
                // `status` -- an expired-but-not-revoked key can still be rotated or explicitly
                // revoked. `derivedStatus` only drives the badge label/tone below, so an expired
                // key reads as "Expired" instead of misreporting as "Active".
                const isActive = item.status === 'active';
                const derivedStatus = getDerivedStatus(item);

                return (
                  <DataCard
                    key={item.id}
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
                          tone={STATUS_BADGE_TONE[derivedStatus]}
                          accessibilityLabel={t(`apiKeys.status.${derivedStatus}`)}>
                          {t(`apiKeys.status.${derivedStatus}`)}
                        </Badge>
                      </Stack>
                    }
                    subtitle={
                      <Text intent="caption">
                        {t('apiKeys.keyPrefixLabel')}{' '}
                        <Text intent="caption" mono>
                          {item.keyPrefix}
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
                    footer={
                      <Stack gap="md">
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

                        <Stack direction="row" gap="md" wrap="wrap" width="full" align="center">
                          <Text intent="caption">{createdLabel}</Text>
                          <Text intent="caption">
                            {item.lastUsedAt
                              ? t('apiKeys.lastUsed', {
                                  date: formatNullableDate(item.lastUsedAt, dateLocale),
                                })
                              : t('apiKeys.neverUsed')}
                          </Text>
                          <ExpiryCaption expiresAt={item.expiresAt} dateLocale={dateLocale} />
                        </Stack>
                      </Stack>
                    }
                  />
                );
              })}
          </Stack>

          <Callout
            tone="warning"
            icon={
              <Feather name="shield" size={designTokens.icon.action} color={colors.secondary} />
            }>
            {t('apiKeys.securityNote')}
          </Callout>
        </Stack>
      </Scroll>
    </Div>
  );
}
