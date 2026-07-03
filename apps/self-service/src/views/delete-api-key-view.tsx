import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, Page, Stack, Text, TextField } from '@lightbridge/ui';

export function DeleteApiKeyView({
  name,
  onConfirm,
  onCancel,
  loading,
}: Readonly<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}>) {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = React.useState('');
  const confirmationTarget = name || t('deleteKey.fallbackName');
  const canDelete = confirmation.trim() === confirmationTarget;

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('deleteKey.title')}</Text>
          <Text intent="body">{t('deleteKey.description', { name })}</Text>
          <Text intent="caption">
            {t('deleteKey.confirmInstruction', { target: confirmationTarget })}
          </Text>
          <TextField
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={confirmationTarget}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('deleteKey.cancel')}
            </Button>
            <Button onPress={onConfirm} disabled={loading || !canDelete}>
              {loading ? t('deleteKey.deleting') : t('deleteKey.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
