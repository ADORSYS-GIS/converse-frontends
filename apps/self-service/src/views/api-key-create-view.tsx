import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Callout,
  Card,
  designTokens,
  Div,
  FormField,
  PageHeader,
  Scroll,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import { OneTimeSecretCard } from '../components/one-time-secret-card';
import { useThemeColors } from '../hooks/use-theme-colors';

type ApiKeyCreateViewProps = {
  onBack: () => void;
  onCreate: (name: string) => void;
  onCopy: (value: string) => void;
  isCreating?: boolean;
  generatedSecret?: string | null;
};

export function ApiKeyCreateView({
  onBack,
  onCreate,
  onCopy,
  isCreating = false,
  generatedSecret = null,
}: Readonly<ApiKeyCreateViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [name, setName] = useState('');

  const trimmedName = name.trim();
  const isSubmitDisabled = isCreating || !trimmedName;

  return (
    <Div tone="muted" width="full" style={{ flex: 1, backgroundColor: colors.muted }}>
      <PageHeader
        title={t('apiKeys.new')}
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

      <Scroll tone="muted" pad="none" style={{ flex: 1 }}>
        <Div
          width="full"
          pad="lg"
          style={{
            paddingBottom: designTokens.layout.formFooterClearance,
          }}>
          <Stack gap="lg">
            {generatedSecret ? (
              <Stack gap="lg">
                <Callout
                  tone="success"
                  icon={
                    <Ionicons
                      name="checkmark-circle"
                      size={designTokens.icon.prominent}
                      color={colors.success}
                    />
                  }>
                  <Stack gap="xs">
                    <Text intent="bodyStrong">{t('apiKeys.createdSuccessfully')}</Text>
                    <Text intent="caption">{t('apiKeys.securityNote')}</Text>
                  </Stack>
                </Callout>

                <OneTimeSecretCard secret={generatedSecret} onCopy={onCopy} />

                <Button variant="ghost" onPress={onBack} width="full">
                  <Text intent="link">{t('apiKeys.backToKeys')}</Text>
                </Button>
              </Stack>
            ) : (
              <Card size="md">
                <Stack gap="md">
                  <FormField label={t('apiKeys.keyLabel')}>
                    <TextField
                      placeholder={t('apiKeys.placeholder')}
                      value={name}
                      onChangeText={setName}
                      selectionColor={colors.primary}
                      autoFocus
                      editable={!isCreating}
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (!isSubmitDisabled) {
                          onCreate(trimmedName);
                        }
                      }}
                    />
                  </FormField>
                  <Button
                    variant="primary"
                    onPress={() => onCreate(trimmedName)}
                    disabled={isSubmitDisabled}
                    width="full">
                    <Text intent="inverseBodyStrong">
                      {isCreating ? t('apiKeys.saving') : t('apiKeys.save')}
                    </Text>
                  </Button>
                </Stack>
              </Card>
            )}
          </Stack>
        </Div>
      </Scroll>
    </Div>
  );
}
