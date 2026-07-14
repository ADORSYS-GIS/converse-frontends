import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Chip,
  designTokens,
  Div,
  Divider,
  Heading,
  Icon as Feather,
  KeyValue,
  PageHeader,
  Scroll,
  SectionCard,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import { useThemeColors } from '../../hooks/use-theme-colors';

type AccountSettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  billingIdentity: string;
  onSaveBillingIdentity: (value: string) => void;
  isSavingBillingIdentity?: boolean;
  owners: string[];
  onAddOwner: (value: string) => void;
  onRemoveOwner: (value: string) => void;
  isSavingOwners?: boolean;
  authIssuer: string;
  authUserLabel: string;
  status?: 'active' | 'suspended';
  canUpdate?: boolean;
  canManageMembers?: boolean;
  canDelete?: boolean;
  canDisable?: boolean;
  onDeleteAccount: () => void;
  onSuspendAccount: () => void;
  onEnableAccount: () => void;
  isChangingStatus?: boolean;
  statusError?: string | null;
  memberError?: string | null;
};

export function AccountSettingsView({
  showBackButton = true,
  onBack,
  billingIdentity,
  onSaveBillingIdentity,
  isSavingBillingIdentity = false,
  owners,
  onAddOwner,
  onRemoveOwner,
  isSavingOwners = false,
  authIssuer,
  authUserLabel,
  status = 'active',
  canUpdate = true,
  canManageMembers = true,
  canDelete = true,
  canDisable = true,
  onDeleteAccount,
  onSuspendAccount,
  onEnableAccount,
  isChangingStatus = false,
  statusError = null,
  memberError = null,
}: Readonly<AccountSettingsViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [billingIdentityDraft, setBillingIdentityDraft] = useState(billingIdentity);
  const [newOwner, setNewOwner] = useState('');

  useEffect(() => {
    setBillingIdentityDraft(billingIdentity);
  }, [billingIdentity]);

  const trimmedDraft = billingIdentityDraft.trim();
  const hasBillingIdentityChanged = trimmedDraft !== billingIdentity.trim();
  const canSaveBillingIdentity =
    hasBillingIdentityChanged && trimmedDraft.length > 0 && !isSavingBillingIdentity;

  const trimmedNewOwner = newOwner.trim();

  const handleAddOwner = () => {
    if (!trimmedNewOwner) return;
    onAddOwner(trimmedNewOwner);
    setNewOwner('');
  };

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
            <Stack direction="row" align="center" gap="sm">
              <Heading tone="title">{t('settings.account.title')}</Heading>
              <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
                {status === 'suspended'
                  ? t('settings.account.statusSuspended')
                  : t('settings.account.statusActive')}
              </Badge>
            </Stack>
          ) : (
            <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
              {status === 'suspended'
                ? t('settings.account.statusSuspended')
                : t('settings.account.statusActive')}
            </Badge>
          )}

          {canUpdate ? (
            <SectionCard
              title={t('settings.account.billingIdentitySection')}
              description={t('settings.account.billingIdentityDescription')}>
              <Stack gap="md">
                <TextField
                  value={billingIdentityDraft}
                  onChangeText={setBillingIdentityDraft}
                  editable={!isSavingBillingIdentity}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => onSaveBillingIdentity(trimmedDraft)}
                  disabled={!canSaveBillingIdentity}
                  style={{ alignSelf: 'flex-start' }}>
                  {isSavingBillingIdentity
                    ? t('settings.account.billingIdentitySaving')
                    : t('settings.account.billingIdentitySave')}
                </Button>
              </Stack>
            </SectionCard>
          ) : null}

          {canManageMembers ? (
            <SectionCard
              title={t('settings.account.ownersSection')}
              description={t('settings.account.ownersDescription')}>
              <Stack gap="md">
                {owners.length === 0 ? (
                  <Text intent="caption">{t('settings.account.ownersEmpty')}</Text>
                ) : (
                  <Stack direction="row" wrap="wrap" gap="sm">
                    {owners.map((owner) => (
                      <Chip
                        key={owner}
                        onRemove={() => onRemoveOwner(owner)}
                        removeAccessibilityLabel={t('settings.account.ownerRemove', {
                          name: owner,
                        })}
                        disabled={isSavingOwners}
                        mono={!owner.includes('@')}>
                        {owner}
                      </Chip>
                    ))}
                  </Stack>
                )}

                <Stack direction="row" gap="sm" align="center">
                  <Div style={{ flex: 1 }}>
                    <TextField
                      value={newOwner}
                      onChangeText={setNewOwner}
                      placeholder={t('settings.account.ownerAddPlaceholder')}
                      editable={!isSavingOwners}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handleAddOwner}
                    />
                  </Div>
                  <Button
                    variant="neutral"
                    size="sm"
                    onPress={handleAddOwner}
                    disabled={!trimmedNewOwner || isSavingOwners}>
                    {t('settings.account.ownerAdd')}
                  </Button>
                </Stack>
                {memberError ? (
                  <Text intent="caption" style={{ color: colors.error }}>
                    {memberError}
                  </Text>
                ) : null}
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
