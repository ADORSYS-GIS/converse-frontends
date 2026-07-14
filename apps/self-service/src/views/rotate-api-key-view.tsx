import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Card,
  designTokens,
  Div,
  Heading,
  Icon as Feather,
  Scroll,
  Stack,
  Text,
} from '@lightbridge/ui';
import { OneTimeSecretCard } from '../components/one-time-secret-card';
import { useThemeColors } from '../hooks/use-theme-colors';

type RotateApiKeyViewProps = {
  keyName: string;
  onBack: () => void;
  onConfirm: () => void;
  onCopy: (value: string) => void;
  isRotating?: boolean;
  generatedSecret?: string | null;
};

export function RotateApiKeyView({
  keyName,
  onBack,
  onConfirm,
  onCopy,
  isRotating = false,
  generatedSecret = null,
}: Readonly<RotateApiKeyViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Div tone="muted" width="full" style={{ flex: 1, backgroundColor: colors.muted }}>
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
            <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
          </Button>

          <Heading tone="title" style={{ fontSize: designTokens.typography.compactTitle }}>
            {t('apiKeys.rotateTitle')}
          </Heading>

          <Div size="iconSm" />
        </Stack>
      </Div>

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
                <Div tone="successSoft" rounded="xl" pad="md" width="full">
                  <Stack direction="row" gap="sm" align="start">
                    <Feather
                      name="check-circle"
                      size={designTokens.icon.prominent}
                      color={colors.success}
                    />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text intent="bodyStrong">{t('apiKeys.rotateSuccess')}</Text>
                      <Text intent="caption">{t('apiKeys.securityNote')}</Text>
                    </Stack>
                  </Stack>
                </Div>

                <OneTimeSecretCard secret={generatedSecret} onCopy={onCopy} />

                <Button variant="ghost" onPress={onBack} width="full">
                  {t('apiKeys.backToKeys')}
                </Button>
              </Stack>
            ) : (
              <Card size="md">
                <Stack gap="md">
                  <Stack direction="row" gap="sm" align="start">
                    <Feather
                      name="refresh-cw"
                      size={designTokens.icon.prominent}
                      color={colors.secondary}
                    />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text intent="bodyStrong">{keyName}</Text>
                      <Text intent="body">{t('apiKeys.rotateDescription', { name: keyName })}</Text>
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap="sm">
                    <Button
                      variant="ghost"
                      onPress={onBack}
                      disabled={isRotating}
                      style={{ flex: 1 }}>
                      {t('apiKeys.rotateCancel')}
                    </Button>
                    <Button
                      variant="primary"
                      onPress={onConfirm}
                      disabled={isRotating}
                      style={{ flex: 1 }}>
                      {isRotating ? t('apiKeys.rotating') : t('apiKeys.rotateConfirm')}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            )}
          </Stack>
        </Div>
      </Scroll>
    </Div>
  );
}
