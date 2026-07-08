import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Chip,
  designTokens,
  Div,
  Divider,
  Heading,
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
  onDeleteAccount: () => void;
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
  onDeleteAccount,
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
            <Button
              variant="ghost"
              size="iconSm"
              onPress={onBack}
              accessibilityLabel={t('apiKeys.back')}>
              <Ionicons name="arrow-back" size={designTokens.icon.nav} color={colors.ink} />
            </Button>
          }
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? <Heading tone="title">{t('settings.account.title')}</Heading> : null}

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
                      removeAccessibilityLabel={t('settings.account.ownerRemove', { name: owner })}
                      disabled={isSavingOwners}>
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
            </Stack>
          </SectionCard>

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

          <SectionCard
            tone="danger"
            title={t('settings.account.dangerSection')}
            description={t('settings.account.dangerDescription')}>
            <Stack align="start">
              <Button
                variant="neutral"
                size="sm"
                onPress={onDeleteAccount}
                style={{ alignSelf: 'flex-start', borderColor: colors.error, borderWidth: 1 }}>
                <Text intent="body" style={{ color: colors.error }}>
                  {t('settings.account.deleteAccount')}
                </Text>
              </Button>
            </Stack>
          </SectionCard>
        </Stack>
      </Scroll>
    </Div>
  );
}
