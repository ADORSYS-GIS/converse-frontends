import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Card,
  designTokens,
  Div,
  Heading,
  Scroll,
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
            <Heading tone="title" style={{ fontSize: designTokens.typography.compactTitle }}>
              {t('settings.account.title')}
            </Heading>
            <Div size="iconSm" />
          </Stack>
        </Div>
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? <Heading tone="title">{t('settings.account.title')}</Heading> : null}

          <Card size="md">
            <Stack gap="md">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.account.billingIdentitySection')}</Text>
                <Text intent="caption">{t('settings.account.billingIdentityDescription')}</Text>
              </Stack>
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
          </Card>

          <Card size="md">
            <Stack gap="md">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.account.ownersSection')}</Text>
                <Text intent="caption">{t('settings.account.ownersDescription')}</Text>
              </Stack>

              {owners.length === 0 ? (
                <Text intent="caption">{t('settings.account.ownersEmpty')}</Text>
              ) : (
                <Stack direction="row" wrap="wrap" gap="sm">
                  {owners.map((owner) => (
                    <Div
                      key={owner}
                      tone="muted"
                      rounded="full"
                      pad="sm"
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                      <Stack direction="row" align="center" gap="xs">
                        <Text intent="caption">{owner}</Text>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onPress={() => onRemoveOwner(owner)}
                          disabled={isSavingOwners}
                          accessibilityLabel={t('settings.account.ownerRemove', { name: owner })}
                          style={{ height: 20, width: 20, paddingHorizontal: 0 }}>
                          <Ionicons name="close" size={14} color={colors.soft} />
                        </Button>
                      </Stack>
                    </Div>
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
          </Card>

          <Card size="md">
            <Stack gap="sm">
              <Text intent="bodyStrong">{t('settings.account.authSection')}</Text>
              <Text intent="caption">{t('settings.account.authDescription')}</Text>
              <Div tone="muted" height="hairline" width="full" />
              <Stack direction="row" justify="between" width="full">
                <Text intent="caption">{t('settings.account.authUserLabel')}</Text>
                <Text intent="bodyStrong">{authUserLabel}</Text>
              </Stack>
              <Stack direction="row" justify="between" width="full">
                <Text intent="caption">{t('settings.account.authIssuerLabel')}</Text>
                <Text intent="bodyStrong" numberOfLines={1} ellipsizeMode="middle">
                  {authIssuer}
                </Text>
              </Stack>
            </Stack>
          </Card>

          <Div tone="muted" rounded="xl" pad="md" width="full">
            <Stack gap="xs">
              <Text intent="bodyStrong">{t('settings.account.policiesSection')}</Text>
              <Text intent="caption">{t('settings.account.policiesUnsupported')}</Text>
            </Stack>
          </Div>

          <Card size="md" style={{ borderWidth: 1, borderColor: colors.error }}>
            <Stack gap="sm">
              <Text intent="bodyStrong" style={{ color: colors.error }}>
                {t('settings.account.dangerSection')}
              </Text>
              <Text intent="caption">{t('settings.account.dangerDescription')}</Text>
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
          </Card>
        </Stack>
      </Scroll>
    </Div>
  );
}
