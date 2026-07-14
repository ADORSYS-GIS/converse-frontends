import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import {
  Button,
  Card,
  designTokens,
  Div,
  Icon as Feather,
  Page,
  Stack,
  Text,
} from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type RevokeApiKeyViewProps = {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function RevokeApiKeyView({
  name,
  onConfirm,
  onCancel,
  loading = false,
}: Readonly<RevokeApiKeyViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Page>
      <Card>
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="start">
            <Div tone="errorSoft" rounded="xl" size="iconMd" align="center" justify="center">
              <Feather
                name="slash"
                size={designTokens.icon.action}
                color={colors.error}
              />
            </Div>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text intent="bodyStrong">{t('apiKeys.revokeConfirmTitle')}</Text>
              <Text intent="body">
                {t('apiKeys.revokeConfirmMessage', { name })}
              </Text>
            </Stack>
          </Stack>

          <Stack direction="row" gap="sm">
            <Button
              variant="ghost"
              onPress={onCancel}
              disabled={loading}
              style={{ flex: 1 }}>
              {t('apiKeys.revokeCancel')}
            </Button>
            <Button
              variant="primary"
              onPress={onConfirm}
              disabled={loading}
              style={{ flex: 1 }}>
              {loading ? t('apiKeys.revoking') : t('apiKeys.revoke')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}