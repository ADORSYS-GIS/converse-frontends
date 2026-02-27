import React, { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Card, Div, Heading, Scroll, Stack, Text, TextField } from '@lightbridge/ui';
import { getThemeColors } from '../theme/theme-colors';

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
  const colors = useMemo(() => getThemeColors('light'), []);
  const [name, setName] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = (value: string) => {
    onCopy(value);
    setCopiedSecret(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedSecret(false), 1800);
  };

  return (
    <Div tone="muted" width="full" style={{ flex: 1, backgroundColor: colors.muted }}>
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
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </Button>

          <Heading tone="title" style={{ fontSize: 20 }}>
            {t('apiKeys.new')}
          </Heading>

          <Div size="iconSm" />
        </Stack>
      </Div>

      <Scroll tone="muted" pad="none" style={{ flex: 1 }}>
        <Div
          width="full"
          pad="lg"
          style={{
            paddingBottom: 140,
          }}>
          <Stack gap="lg">
            {generatedSecret ? (
              <Stack gap="lg">
                <Div tone="successSoft" rounded="xl" pad="md" width="full">
                  <Stack direction="row" gap="sm" align="start">
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text intent="bodyStrong">{t('apiKeys.createdSuccessfully')}</Text>
                      <Text intent="caption">{t('apiKeys.securityNote')}</Text>
                    </Stack>
                  </Stack>
                </Div>

                <Card size="md">
                  <Stack gap="md">
                    <Text intent="caption">{t('apiKeys.yourNewKey')}</Text>
                    <Div
                      tone="muted"
                      pad="md"
                      rounded="xl"
                      style={{ borderWidth: 1, borderColor: colors.border }}>
                      <Text intent="bodyStrong" selectable>
                        {generatedSecret}
                      </Text>
                    </Div>
                    <Button
                      variant="neutral"
                      onPress={() => handleCopy(generatedSecret)}
                      width="full">
                      <Stack direction="row" align="center" gap="xs">
                        <Ionicons
                          name={copiedSecret ? 'checkmark' : 'copy'}
                          size={18}
                          color={colors.primary}
                        />
                        <Text intent="link">
                          {copiedSecret ? t('apiKeys.copied') : t('apiKeys.copy')}
                        </Text>
                      </Stack>
                    </Button>
                  </Stack>
                </Card>

                <Button variant="ghost" onPress={onBack} width="full">
                  <Text intent="link">{t('apiKeys.backToKeys')}</Text>
                </Button>
              </Stack>
            ) : (
              <Card size="md">
                <Stack gap="md">
                  <Stack gap="xs">
                    <Text intent="bodyStrong">{t('apiKeys.keyLabel')}</Text>
                    <TextField
                      placeholder={t('apiKeys.placeholder')}
                      value={name}
                      onChangeText={setName}
                      selectionColor={colors.primary}
                      autoFocus
                    />
                  </Stack>
                  <Button
                    variant="primary"
                    onPress={() => onCreate(name)}
                    disabled={isCreating || !name.trim()}
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
