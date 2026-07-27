import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Card,
  designTokens,
  Div,
  Divider,
  Heading,
  Icon as Feather,
  KeyValue,
  PageHeader,
  Scroll,
  SectionCard,
  Skeleton,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import type { Account } from '@lightbridge/hooks';
import { useThemeColors } from '../../hooks/use-theme-colors';

type AccountSettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  accounts?: Account[];
  selectedAccountId?: string;
  isLoading?: boolean;
  onSelectAccount: (id: string) => void;
  defaultQuota: string;
  onSaveDefaultQuota: (value: string) => void;
  isSavingDefaultQuota?: boolean;
  authIssuer: string;
  authUserLabel: string;
  status?: 'active' | 'suspended';
  canUpdate?: boolean;
  canDelete?: boolean;
  canDisable?: boolean;
  onDeleteAccount: () => void;
  onSuspendAccount: () => void;
  onEnableAccount: () => void;
  isChangingStatus?: boolean;
  statusError?: string | null;
};

export function AccountSettingsView({
  showBackButton = true,
  onBack,
  accounts = [],
  selectedAccountId,
  isLoading = false,
  onSelectAccount,
  defaultQuota,
  onSaveDefaultQuota,
  isSavingDefaultQuota = false,
  authIssuer,
  authUserLabel,
  status = 'active',
  canUpdate = true,
  canDelete = true,
  canDisable = true,
  onDeleteAccount,
  onSuspendAccount,
  onEnableAccount,
  isChangingStatus = false,
  statusError = null,
}: Readonly<AccountSettingsViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [defaultQuotaDraft, setDefaultQuotaDraft] = useState(defaultQuota);

  useEffect(() => {
    setDefaultQuotaDraft(defaultQuota);
  }, [defaultQuota]);

  const trimmedDraft = defaultQuotaDraft.trim();
  const hasDefaultQuotaChanged = trimmedDraft !== defaultQuota.trim();
  const canSaveDefaultQuota = hasDefaultQuotaChanged && !isSavingDefaultQuota;

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.account.title')}
          leading={
            <Stack direction="row" align="center" gap="sm">
              <Button
                variant="ghost"
                size="iconSm"
                onPress={onBack}
                accessibilityLabel={t('apiKeys.back')}>
                <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
              </Button>
              <Text intent="caption">{t('nav.settings')}</Text>
              <Feather name="chevron-right" size={14} color={colors.subtle} />
            </Stack>
          }
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? (
            <Stack direction="row" align="center" justify="between" width="full">
              <Stack direction="row" align="center" gap="sm">
                <Heading tone="title">{t('settings.account.title')}</Heading>
                <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
                  {status === 'suspended'
                    ? t('settings.account.statusSuspended')
                    : t('settings.account.statusActive')}
                </Badge>
              </Stack>
            </Stack>
          ) : (
            <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
              {status === 'suspended'
                ? t('settings.account.statusSuspended')
                : t('settings.account.statusActive')}
            </Badge>
          )}

          <Card size="sm">
            <Stack gap="xs">
              <Text intent="bodyStrong">{t('settings.account.accountsLabel')}</Text>
              {isLoading && accounts.length === 0 ? (
                <Stack direction="row" gap="sm">
                  <Skeleton width={96} height={36} rounded="xl" />
                  <Skeleton width={96} height={36} rounded="xl" />
                </Stack>
              ) : accounts.length === 0 ? (
                <Text intent="caption">{t('settings.account.noAccounts')}</Text>
              ) : (
                <Stack direction="row" wrap="wrap" gap="sm">
                  {accounts.map((account) => (
                    <Button
                      key={account.id}
                      variant={account.id === selectedAccountId ? 'primary' : 'neutral'}
                      size="sm"
                      onPress={() => onSelectAccount(account.id)}
                      accessibilityLabel={t('settings.account.selectAccount', {
                        account: account.id,
                      })}>
                      {account.id}
                    </Button>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>

          {canUpdate ? (
            <SectionCard
              title={t('settings.account.defaultQuotaSection')}
              description={t('settings.account.defaultQuotaDescription')}>
              <Stack gap="md">
                <TextField
                  value={defaultQuotaDraft}
                  onChangeText={setDefaultQuotaDraft}
                  editable={!isSavingDefaultQuota}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => onSaveDefaultQuota(trimmedDraft)}
                  disabled={!canSaveDefaultQuota}
                  style={{ alignSelf: 'flex-start' }}>
                  {isSavingDefaultQuota
                    ? t('settings.account.defaultQuotaSaving')
                    : t('settings.account.defaultQuotaSave')}
                </Button>
              </Stack>
            </SectionCard>
          ) : null}

          <SectionCard
            title={t('settings.account.authSection')}
            description={t('settings.account.authDescription')}>
            <Stack gap="sm">
              <Divider tone="muted" />
              <KeyValue label={t('settings.account.authUserLabel')} value={authUserLabel} />
              <KeyValue label={t('settings.account.authIssuerLabel')} value={authIssuer} />
            </Stack>
          </SectionCard>

          <SectionCard
            tone="muted"
            title={t('settings.account.policiesSection')}
            description={t('settings.account.policiesUnsupported')}
          />

          {canDisable ? (
            <SectionCard
              tone={status === 'suspended' ? 'danger' : 'muted'}
              title={t('settings.account.suspendSection')}
              description={t('settings.account.suspendDescription')}>
              <Stack gap="sm" align="start">
                <Button
                  variant={status === 'suspended' ? 'neutral' : 'danger'}
                  size="sm"
                  disabled={isChangingStatus}
                  onPress={status === 'suspended' ? onEnableAccount : onSuspendAccount}
                  style={{ alignSelf: 'flex-start' }}>
                  {status === 'suspended'
                    ? isChangingStatus
                      ? t('settings.account.enabling')
                      : t('settings.account.enableAccount')
                    : isChangingStatus
                      ? t('settings.account.suspending')
                      : t('settings.account.suspendAccount')}
                </Button>
                {statusError ? (
                  <Text intent="caption" style={{ color: colors.error }}>
                    {statusError}
                  </Text>
                ) : null}
              </Stack>
            </SectionCard>
          ) : null}

          {canDelete ? (
            <SectionCard
              tone="danger"
              title={t('settings.account.dangerSection')}
              description={t('settings.account.dangerDescription')}>
              <Stack align="start">
                <Button
                  variant="danger"
                  size="sm"
                  onPress={onDeleteAccount}
                  style={{ alignSelf: 'flex-start' }}>
                  {t('settings.account.deleteAccount')}
                </Button>
              </Stack>
            </SectionCard>
          ) : null}
        </Stack>
      </Scroll>
    </Div>
  );
}
